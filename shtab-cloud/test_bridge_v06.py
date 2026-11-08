"""V0.6 integration tests. Local harness is NOT a proof of AI model calls.
Fixture bridge state is manually seeded for transport-only tests; production
start_from_verified_john rejects unverified/absent API results.
"""
import io, json, os, tempfile, time, unittest
from pathlib import Path
from fastapi.testclient import TestClient
from server.app_v04 import create_app_v04
from server.handoff_v06 import ReviewInput
from server.phase02 import SliceError

# CI defaults to a generated *real media file*, not a fake MP4. The artist's
# own Lifehack #1 file can be supplied via env vars for a separate E2E test.
SOURCE=Path(os.environ.get('SHTAB_BRIDGE_FIXTURE_MP4',str(Path(tempfile.gettempdir())/'shtab_bridge_ci_fixture_v06.mp4')))
CAPTIONS=Path(os.environ.get('SHTAB_BRIDGE_FIXTURE_SRT',str(Path(tempfile.gettempdir())/'shtab_bridge_ci_fixture_v06.srt')))
if not SOURCE.is_file() or not CAPTIONS.is_file():
 import subprocess
 SOURCE.parent.mkdir(parents=True,exist_ok=True)
 cmd=['ffmpeg','-nostdin','-hide_banner','-v','error','-y',
      '-f','lavfi','-i','testsrc2=size=320x568:rate=15',
      '-f','lavfi','-i','sine=frequency=460:sample_rate=44100',
      '-t','2','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',
      '-c:a','aac','-b:a','96k','-shortest',str(SOURCE)]
 subprocess.run(cmd,check=True,timeout=40,capture_output=True)
 CAPTIONS.write_text('1\n00:00:00,100 --> 00:00:01,500\nПроверка транспорта V0.6\n',encoding='utf-8')


class TransportBridge06(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory()
  self.orig={k:os.environ.get(k) for k in ('SHTAB_SEMEN_WORKER_TOKEN','SHTAB_RICK_WORKER_TOKEN')}
  os.environ['SHTAB_SEMEN_WORKER_TOKEN']='unit-test-editor-token'
  os.environ['SHTAB_RICK_WORKER_TOKEN']='unit-test-rick-token'
  self.app=create_app_v04(self.temp.name,'owner-test-token',start_worker=False)
  self.c=TestClient(self.app);self.c.__enter__()
  self.h={'Authorization':'Bearer owner-test-token'}
  r=self.c.post('/api/projects',headers=self.h,json={'title':'Настоящий тест MP4','goal':'Проверка доставки между ролями'})
  self.assertEqual(200,r.status_code,r.text);self.pid=r.json()['id']
 def tearDown(self):
  self.c.__exit__(None,None,None);self.temp.cleanup()
  for k,v in self.orig.items():
   if v is None:os.environ.pop(k,None)
   else:os.environ[k]=v
 def boot_test_only(self):
  # Not a simulated model call or an agent report: transport fixture only.
  with self.app.state.store.tx() as cx:
   now=time.time()
   cx.execute('INSERT INTO bridge_v06(project_id,state,opened_at,updated_at) VALUES(?,?,?,?)',(self.pid,'WAITING_FOR_SEMEN',now,now))
   self.app.state.store.event(cx,self.pid,'TEST_FIXTURE','TEST_ONLY_TRANSPORT_BOOTSTRAP',detail={'agent_api_connected':False})
 def output(self,job_id='trial-editor-job-1'):
  self.assertTrue(SOURCE.is_file() and CAPTIONS.is_file())
  return self.c.post(f'/api/workers/semen/projects/{self.pid}/output',headers={'X-Shtab-Role-Token':'unit-test-editor-token'},
   files={'file':('test-real-video.mp4',SOURCE.read_bytes(),'video/mp4'),
          'srt':('test-real-subtitles.srt',CAPTIONS.read_bytes(),'text/plain')},
   data={'editor_job_id':job_id,'manifest':json.dumps({'output':'real ffmpeg render','model_run':False})})
 def review(self,v,sha,verdict='REWORK'):
  return self.c.post(f'/api/workers/rick/projects/{self.pid}/review',headers={'X-Shtab-Role-Token':'unit-test-rick-token'},json={
   'version':v,'sha256':sha,'verdict':verdict,
   'assessment':'Test-only editorial transport note; no artistic assessment was performed.',
   'audiovisual_claim':'TEST ONLY: technical FFmpeg decode; no actual viewing/listening',
   'reviewer_receipt':'fixture-only-review-no-genuine-rick-call'})
 def test_not_allowed_to_start_without_genuine_john(self):
  r=self.c.post(f'/api/projects/{self.pid}/handoff/start',headers=self.h)
  self.assertEqual(409,r.status_code,r.text)
  self.assertIn('sealed',r.text)
 def test_unauthenticated_worker_cannot_pull_video(self):
  self.boot_test_only()
  for url in (f'/api/workers/semen/tasks',f'/api/workers/rick/tasks'):
   self.assertEqual(403,self.c.get(url).status_code)
  self.assertEqual(403,self.c.post(f'/api/workers/semen/projects/{self.pid}/output',
    files={'file':('test.mp4',SOURCE.read_bytes()),'srt':('test.srt',CAPTIONS.read_bytes())},
    data={'editor_job_id':'probe','manifest':'{}'}).status_code)
 def test_real_editor_mp4_srt_to_rick_and_back(self):
  self.boot_test_only()
  tasks=self.c.get('/api/workers/semen/tasks',headers={'X-Shtab-Role-Token':'unit-test-editor-token'}).json()['tasks']
  self.assertEqual(1,len(tasks))
  first=self.output()
  self.assertEqual(200,first.status_code,first.text)
  e=first.json()
  self.assertEqual('RICK_AV_PENDING',self.c.get(f'/api/projects/{self.pid}',headers=self.h).json()['state'])
  self.assertTrue(e['technical_qc']['full_video_decoded'])
  self.assertTrue(e['technical_qc']['full_audio_decoded'])
  self.assertEqual(64,len(e['sha256']))
  rtasks=self.c.get('/api/workers/rick/tasks',headers={'X-Shtab-Role-Token':'unit-test-rick-token'}).json()['tasks']
  self.assertEqual(1,len(rtasks))
  asset=next(x for x in rtasks[0]['assets'] if x['kind']=='editor_render')
  r=self.c.get(asset['download_path'],headers={'X-Shtab-Role-Token':'unit-test-rick-token'})
  self.assertEqual(200,r.status_code)
  self.assertEqual(SOURCE.read_bytes(),r.content)
  stale=self.review(1,'0'*64)
  self.assertEqual(409,stale.status_code)
  changed=self.review(1,e['sha256'])
  self.assertEqual(200,changed.status_code,changed.text)
  self.assertEqual('SEMEN_REWORK_PENDING',changed.json()['state'])
  self.assertEqual('SEMEN_REWORK_PENDING',self.c.get(f'/api/projects/{self.pid}',headers=self.h).json()['state'])
  self.assertEqual(1,changed.json()['rebuilds'])
  semtasks=self.c.get('/api/workers/semen/tasks',headers={'X-Shtab-Role-Token':'unit-test-editor-token'}).json()['tasks']
  self.assertEqual(1,len(semtasks))
  self.assertEqual('REWORK',semtasks[0]['last_rick_review']['verdict'])
  # New editor job returns another actual MP4 (same bytes are explicitly allowed as
  # valid transport, NOT considered artistic improvement).
  r2=self.output('trial-editor-job-2')
  self.assertEqual(200,r2.status_code,r2.text)
  oldreview=self.review(1,e['sha256'])
  self.assertEqual(409,oldreview.status_code)
  result=self.review(2,r2.json()['sha256'],'ACCEPT_FOR_TIMA')
  self.assertEqual(200,result.status_code,result.text)
  self.assertEqual('RICK_CLAIM_PENDING_AV_ATTESTATION',result.json()['state'])
  self.assertEqual('RICK_CLAIM_PENDING_AV_ATTESTATION',self.c.get(f'/api/projects/{self.pid}',headers=self.h).json()['state'])
  self.assertFalse(result.json()['av_gate_passed'])
  self.assertEqual('DISABLED',result.json()['publish_api'])
  st=self.c.get(f'/api/projects/{self.pid}/handoff',headers=self.h).json()
  self.assertEqual([x['to_actor'] for x in st['moves']],['RICK','SEMEN','RICK','TIMA'])
  self.assertEqual(2,st['revision'])
 def test_stop_blocks_future_worker_submission(self):
  self.boot_test_only()
  r=self.c.post(f'/api/projects/{self.pid}/stop',headers=self.h)
  self.assertEqual(200,r.status_code)
  self.assertEqual(404,self.c.get(f'/api/workers/semen/projects/{self.pid}/assets/missing',headers={'X-Shtab-Role-Token':'unit-test-editor-token'}).status_code)
  self.assertEqual(409,self.output().status_code)
 def test_review_requires_dedicated_role_token(self):
  self.boot_test_only();r=self.output();self.assertEqual(200,r.status_code)
  req={'version':1,'sha256':r.json()['sha256'],'verdict':'REWORK','assessment':'This text has more than ten characters',
       'audiovisual_claim':'No actual video observation carried out','reviewer_receipt':'test-fixture'}
  self.assertEqual(403,self.c.post(f'/api/projects/{self.pid}/handoff/rick-review',headers=self.h,json=req).status_code)