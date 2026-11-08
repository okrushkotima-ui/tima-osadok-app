"""Audited role-to-role transport. It does not impersonate existing ChatGPT chats.

JOHN strategy -> SEMEN MP4 submission -> RICK AV review -> SEMEN rework ...
All moves are transactionally recorded; an API receipt is NOT an agent/model run.
The owner can inspect but cannot submit signed worker outputs through owner auth.
"""
from __future__ import annotations
import hashlib, json, os, secrets, subprocess, time, uuid
from pathlib import Path
from fastapi import UploadFile, File, Form, Header, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from .phase02 import SliceError, probe_video, sha_file, _has_valid_srt_cue

DDL='''
CREATE TABLE IF NOT EXISTS bridge_v06(
 project_id TEXT PRIMARY KEY REFERENCES projects(id),
 state TEXT NOT NULL DEFAULT 'WAITING_FOR_JOHN',
 clip_id TEXT NOT NULL DEFAULT 'clip-1',
 version INTEGER NOT NULL DEFAULT 0,
 rebuilds INTEGER NOT NULL DEFAULT 0 CHECK(rebuilds BETWEEN 0 AND 3),
 current_asset_id TEXT,
 current_sha256 TEXT,
 opened_at REAL NOT NULL,
 updated_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS bridge_handoffs(
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
 seq INTEGER NOT NULL, from_actor TEXT NOT NULL, to_actor TEXT NOT NULL,
 action TEXT NOT NULL, version INTEGER NOT NULL,
 asset_sha256 TEXT, detail_json TEXT NOT NULL, created_at REAL NOT NULL,
 UNIQUE(project_id,seq));
CREATE TABLE IF NOT EXISTS bridge_reviews(
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
 version INTEGER NOT NULL, asset_sha256 TEXT NOT NULL,
 verdict TEXT NOT NULL, assessment TEXT NOT NULL,
 audiovisual_claim TEXT NOT NULL, reviewer_receipt TEXT NOT NULL,
 created_at REAL NOT NULL, UNIQUE(project_id,version));
'''

class ReviewInput(BaseModel):
 version:int=Field(ge=1)
 sha256:str=Field(min_length=64,max_length=64)
 verdict:str
 assessment:str=Field(min_length=10,max_length=20000)
 audiovisual_claim:str=Field(min_length=10,max_length=1000)
 reviewer_receipt:str=Field(min_length=5,max_length=512)

class Bridge:
 def __init__(self,db,folder):
  self.db=db;self.folder=Path(folder)
  with self.db.tx() as c:c.executescript(DDL)
 def record(self,c,pid,actor,to,action,version,sha=None,detail=None):
  seq=c.execute('SELECT COALESCE(MAX(seq),0)+1 FROM bridge_handoffs WHERE project_id=?',(pid,)).fetchone()[0]
  c.execute('INSERT INTO bridge_handoffs VALUES(?,?,?,?,?,?,?,?,?,?)',
   (str(uuid.uuid4()),pid,seq,actor,to,action,version,sha,json.dumps(detail or {},ensure_ascii=False),time.time()))
  self.db.event(c,pid,actor,action,version=version,artifact_sha256=sha,detail={'to':to,**(detail or {})})
 def status(self,pid):
  p=self.db.project(pid)
  if not p:raise SliceError('Project missing')
  cur=self.db.one('SELECT * FROM bridge_v06 WHERE project_id=?',(pid,))
  log=self.db.rows('SELECT seq,from_actor,to_actor,action,version,asset_sha256,detail_json,created_at FROM bridge_handoffs WHERE project_id=? ORDER BY seq',(pid,))
  for x in log:x['detail']=json.loads(x.pop('detail_json'))
  return {'state':cur['state'] if cur else p['state'],'revision':cur['version'] if cur else 0,
   'rebuilds':cur['rebuilds'] if cur else 0,'current_sha256':cur['current_sha256'] if cur else None,
   'moves':log,'real_chatgpt_plugins_invoked':False,'publish_api':'DISABLED'}
 def start_from_verified_john(self,pid):
  p=self.db.project(pid)
  if not p or p['stopped']:raise SliceError('Stopped or missing')
  fc=self.db.one('SELECT * FROM fullcycle_meta WHERE project_id=?',(pid,))
  meta=self.db.one('SELECT sources_sealed,evidence_hash FROM slice_meta WHERE project_id=?',(pid,))
  if not fc or not meta or not meta['sources_sealed']:raise SliceError('No sealed source files')
  gates=self.db.rows('SELECT actor,verified,provider,response_id,output_sha256,evidence_sha256 FROM slice_runs WHERE project_id=? ORDER BY created_at',(pid,))
  johns=[x for x in gates if x['actor']=='JOHN' and x['verified'] and x['provider']=='OpenAI Responses API' and x['response_id'].startswith('resp_') and x['evidence_sha256']==meta['evidence_hash']]
  if not johns:raise SliceError('BLOCKED_NO_VERIFIED_JOHN: no real API strategy result')
  with self.db.tx() as c:
   if c.execute('SELECT stopped FROM projects WHERE id=?',(pid,)).fetchone()['stopped']:raise SliceError('Stopped')
   prev=c.execute('SELECT state FROM bridge_v06 WHERE project_id=?',(pid,)).fetchone()
   if prev:return {'status':prev['state'],'idempotent':True}
   now=time.time()
   c.execute('INSERT INTO bridge_v06(project_id,state,opened_at,updated_at) VALUES(?,?,?,?)',(pid,'WAITING_FOR_SEMEN',now,now))
   self.db.state(c,pid,'WAITING_FOR_SEMEN')
   self.record(c,pid,'JOHN','SEMEN','VERIFIED_BRIEF_TO_EDITOR',0,meta['evidence_hash'],
     {'response_id':johns[-1]['response_id'],'strategy_sha256':johns[-1]['output_sha256'],'source_evidence_sha256':meta['evidence_hash']})
  return {'status':'WAITING_FOR_SEMEN','idempotent':False}
 @staticmethod
 def verify_full_media(path):
  meta=probe_video(path)
  # Full stream decoding, not only metadata and the first frame.
  proc=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-v','error','-xerror','-i',str(path),'-map','0:v:0','-f','null','-'],capture_output=True,text=True,timeout=180)
  if proc.returncode:raise SliceError('Complete video decode failed: '+proc.stderr[-250:])
  audio=subprocess.run(['ffprobe','-v','error','-select_streams','a','-show_entries','stream=codec_name','-of','json',str(path)],capture_output=True,text=True,timeout=20)
  if audio.returncode:raise SliceError('ffprobe audio failed')
  streams=json.loads(audio.stdout).get('streams',[])
  if not streams:raise SliceError('No audio stream, needs review')
  decoded_audio=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-v','error','-xerror','-i',str(path),'-map','0:a:0','-f','null','-'],capture_output=True,text=True,timeout=180)
  if decoded_audio.returncode:raise SliceError('Complete audio decode failed')
  return {**meta,'full_video_decoded':True,'full_audio_decoded':True,'audio_stream_present':True}
 def accept_editor_render(self,pid,temp,filename,srt_path,srt_name,editor_job_id,editor_manifest):
  if Path(filename).suffix.lower()!='.mp4':raise SliceError('Editor must return a real MP4')
  if not editor_job_id or len(editor_job_id)>128:raise SliceError('Invalid editor job ID')
  if not editor_manifest or len(editor_manifest)>20000:raise SliceError('Missing edit manifest')
  metadata=self.verify_full_media(temp)
  digest=sha_file(temp)
  if Path(srt_name).suffix.lower()!='.srt' or not srt_path.is_file() or srt_path.stat().st_size>250_000:
   raise SliceError('Editor must return a paired SRT <=250KB')
  raw=srt_path.read_bytes()
  try:body=raw.decode('utf-8-sig')
  except UnicodeDecodeError:raise SliceError('SRT must be UTF-8')
  if not _has_valid_srt_cue(body):raise SliceError('SRT missing valid timing cues')
  subsha=hashlib.sha256(raw).hexdigest()
  metadata['srt_is_unverified_spoken_text']=True
  metadata['srt_sha256']=subsha
  with self.db.tx() as c:
   cur=c.execute('SELECT * FROM bridge_v06 WHERE project_id=?',(pid,)).fetchone()
   p=c.execute('SELECT stopped FROM projects WHERE id=?',(pid,)).fetchone()
   if not cur or not p or p['stopped']:raise SliceError('No active handoff')
   if cur['state'] not in ('WAITING_FOR_SEMEN','SEMEN_REWORK_PENDING'):raise SliceError('Editor return not expected in '+cur['state'])
   old=c.execute('SELECT 1 FROM bridge_handoffs WHERE project_id=? AND action=? AND detail_json LIKE ?',(pid,'VERIFIED_EDITOR_MP4_RECEIVED','%"editor_job_id": "'+editor_job_id+'"%')).fetchone()
   if old:raise SliceError('Duplicate editor job')
   rev=cur['version']+1
   if rev>4:raise SliceError('Max 3 rebuilds reached')
   asset_id=str(uuid.uuid4());subid=str(uuid.uuid4())
   dest=self.folder/pid/'assets'/(asset_id+'.mp4')
   subdest=self.folder/pid/'assets'/(subid+'.srt')
   dest.parent.mkdir(parents=True,exist_ok=True)
   # Copy, don't move, to preserve temp for error handling; stage before DB commit.
   import shutil
   shutil.copyfile(temp,dest)
   shutil.copyfile(srt_path,subdest)
   if sha_file(dest)!=digest or sha_file(subdest)!=subsha:
    dest.unlink(missing_ok=True);subdest.unlink(missing_ok=True)
    raise SliceError('Copied output SHA mismatch')
   try:
    c.execute('INSERT INTO assets(id,project_id,clip_id,version,kind,original_name,stored_name,sha256,bytes,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
     (asset_id,pid,cur['clip_id'],rev,'editor_render',Path(filename).name,asset_id+'.mp4',digest,dest.stat().st_size,time.time()))
    c.execute('INSERT INTO assets(id,project_id,clip_id,version,kind,original_name,stored_name,sha256,bytes,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
     (subid,pid,cur['clip_id'],rev,'editor_srt',Path(srt_name).name,subid+'.srt',subsha,subdest.stat().st_size,time.time()))
    c.execute('UPDATE bridge_v06 SET state=?,version=?,current_asset_id=?,current_sha256=?,updated_at=? WHERE project_id=?',
     ('RICK_AV_PENDING',rev,asset_id,digest,time.time(),pid))
    self.db.state(c,pid,'RICK_AV_PENDING')
    self.record(c,pid,'SEMEN','RICK','VERIFIED_EDITOR_MP4_RECEIVED',rev,digest,
     {'editor_job_id':editor_job_id,'render_manifest':editor_manifest,'technical_qc':metadata,'asset_id':asset_id,'srt_asset_id':subid,'srt_sha256':subsha})
   except:
    dest.unlink(missing_ok=True);subdest.unlink(missing_ok=True);raise
  return {'state':'RICK_AV_PENDING','sha256':digest,'version':rev,'asset_id':asset_id,'srt_asset_id':subid,'srt_sha256':subsha,'technical_qc':metadata}
 def submit_review(self,pid,x:ReviewInput):
  if x.verdict not in ('REWORK','ACCEPT_FOR_TIMA','BLOCKED_AV_EVIDENCE'):raise SliceError('Bad verdict')
  if not all(ch in '0123456789abcdef' for ch in x.sha256):raise SliceError('Bad SHA')
  with self.db.tx() as c:
   cur=c.execute('SELECT * FROM bridge_v06 WHERE project_id=?',(pid,)).fetchone()
   p=c.execute('SELECT stopped FROM projects WHERE id=?',(pid,)).fetchone()
   if not cur or not p or p['stopped']:raise SliceError('No active handoff')
   if cur['state']!='RICK_AV_PENDING' or cur['version']!=x.version or cur['current_sha256']!=x.sha256:
    raise SliceError('Old-version or unexpected Rick review')
   if c.execute('SELECT 1 FROM bridge_reviews WHERE project_id=? AND version=?',(pid,x.version)).fetchone():raise SliceError('Review already submitted')
   # Review callback identifies its author via a distinct worker secret, but is NOT
   # a cryptographically verified audio/video model call. Never call it G4 passing.
   if x.verdict=='REWORK':
    state='SEMEN_REWORK_PENDING' if x.version<=3 else 'NEEDS_TIMA_DECISION'
    rebuilds=cur['rebuilds']+1 if x.version<=3 else cur['rebuilds']
    dest='SEMEN' if state=='SEMEN_REWORK_PENDING' else 'TIMA'
   elif x.verdict=='ACCEPT_FOR_TIMA':
    state='RICK_CLAIM_PENDING_AV_ATTESTATION';rebuilds=cur['rebuilds'];dest='TIMA'
   else:state='BLOCKED_AV_EVIDENCE';rebuilds=cur['rebuilds'];dest='TIMA'
   c.execute('INSERT INTO bridge_reviews VALUES(?,?,?,?,?,?,?,?,?)',
    (str(uuid.uuid4()),pid,x.version,x.sha256,x.verdict,x.assessment,x.audiovisual_claim,x.reviewer_receipt,time.time()))
   c.execute('UPDATE bridge_v06 SET state=?,rebuilds=?,updated_at=? WHERE project_id=?',(state,rebuilds,time.time(),pid))
   self.db.state(c,pid,state)
   self.record(c,pid,'RICK',dest,'RICK_REVIEW_'+x.verdict,x.version,x.sha256,
    {'assessment':x.assessment,'audiovisual_claim':x.audiovisual_claim,'reviewer_receipt':x.reviewer_receipt,'review_not_cryptographically_attested':True})
  return {'state':state,'version':x.version,'rebuilds':rebuilds,'av_gate_passed':False,'publish_api':'DISABLED'}


def attach_bridge(app,coord,db,folder,auth):
 bridge=Bridge(db,folder)
 app.state.bridge=bridge
 def pid_ok(pid):
  if not db.project(pid) or not db.one('SELECT project_id FROM fullcycle_meta WHERE project_id=?',(pid,)):
   raise HTTPException(404,'Project not found')
 def secure_role(role,token):
  required=os.environ.get('SHTAB_'+role+'_WORKER_TOKEN','')
  if not required or not token or not secrets.compare_digest(token,required):
   raise HTTPException(403,'Role worker has not been connected with a dedicated secret')
 def handle(fun,*args):
  try:return fun(*args)
  except SliceError as e:raise HTTPException(409,str(e)) from e
 @app.get('/api/projects/{pid}/handoff',dependencies=[Depends(auth)])
 def current(pid:str):pid_ok(pid);return handle(bridge.status,pid)
 @app.post('/api/projects/{pid}/handoff/start',dependencies=[Depends(auth)])
 def start(pid:str):pid_ok(pid);return handle(bridge.start_from_verified_john,pid)
 @app.post('/api/projects/{pid}/handoff/editor-output',dependencies=[Depends(auth)])
 async def editor_output(pid:str,file:UploadFile=File(...),srt:UploadFile=File(...),editor_job_id:str=Form(...),manifest:str=Form(...),x_shtab_role_token:str|None=Header(None)):
  pid_ok(pid);secure_role('SEMEN',x_shtab_role_token)
  if Path(file.filename or '').suffix.lower()!='.mp4':raise HTTPException(400,'MP4 only')
  temp=Path(folder)/pid/('.editor-upload-'+uuid.uuid4().hex+'.mp4')
  temp_srt=Path(folder)/pid/('.editor-upload-'+uuid.uuid4().hex+'.srt')
  temp.parent.mkdir(parents=True,exist_ok=True)
  size=0
  try:
   with temp.open('wb') as out:
    while data:=await file.read(1024*1024):
     size+=len(data)
     if size>int(os.environ.get('SHTAB_MAX_UPLOAD_BYTES','31457280')):raise HTTPException(413,'Render upload too large')
     out.write(data)
   data=await srt.read(250_001)
   if len(data)>250_000:raise HTTPException(413,'SRT too large')
   temp_srt.write_bytes(data)
   return handle(bridge.accept_editor_render,pid,temp,file.filename,temp_srt,srt.filename or 'captions.srt',editor_job_id,manifest)
  finally:temp.unlink(missing_ok=True);temp_srt.unlink(missing_ok=True);await file.close();await srt.close()
 @app.get('/api/workers/{role}/tasks')
 def worker_tasks(role:str,x_shtab_role_token:str|None=Header(None)):
  role=role.upper()
  if role not in ('SEMEN','RICK'):raise HTTPException(404)
  secure_role(role,x_shtab_role_token)
  desired='WAITING_FOR_SEMEN' if role=='SEMEN' else 'RICK_AV_PENDING'
  states=(desired,'SEMEN_REWORK_PENDING') if role=='SEMEN' else (desired,)
  placeholders=','.join('?' for _ in states)
  records=db.rows('SELECT b.project_id,b.state,b.version,b.current_sha256,p.title,p.goal FROM bridge_v06 b JOIN projects p ON p.id=b.project_id WHERE p.stopped=0 AND b.state IN ('+placeholders+') ORDER BY b.updated_at',(tuple(states)))
  output=[]
  for row in records:
   pid=row['project_id'];assets=db.rows('SELECT id,kind,original_name,sha256,version FROM assets WHERE project_id=? AND kind IN ("source","editor_render","editor_srt") ORDER BY created_at',(pid,))
   # There is no public/download-link bypass: each asset must be fetched with the same role token.
   if role=='RICK':assets=[a for a in assets if a['kind'] in ('editor_render','editor_srt') and a['version']==row['version']]
   review=db.one('SELECT assessment,verdict,asset_sha256 FROM bridge_reviews WHERE project_id=? ORDER BY created_at DESC LIMIT 1',(pid,)) if role=='SEMEN' else None
   brief=db.one('SELECT output_text,response_id,verified FROM slice_runs WHERE project_id=? AND actor="JOHN" ORDER BY created_at DESC LIMIT 1',(pid,)) if role=='SEMEN' else None
   output.append({**row,'assets':[{'id':a['id'],'name':a['original_name'],'kind':a['kind'],'sha256':a['sha256'],
     'download_path':f'/api/workers/{role.lower()}/projects/{pid}/assets/{a["id"]}'} for a in assets],
     'john_brief':brief if brief and brief['verified'] else None,'last_rick_review':review})
  return {'role':role,'tasks':output,'real_plugin_connected':False}
 @app.get('/api/workers/{role}/projects/{pid}/assets/{aid}')
 def worker_download(role:str,pid:str,aid:str,x_shtab_role_token:str|None=Header(None)):
  role=role.upper()
  if role not in ('SEMEN','RICK'):raise HTTPException(404)
  secure_role(role,x_shtab_role_token)
  status=db.one('SELECT state,version FROM bridge_v06 WHERE project_id=?',(pid,))
  if not status or db.project(pid)['stopped']:raise HTTPException(404)
  state_ok=status['state'] in (('WAITING_FOR_SEMEN','SEMEN_REWORK_PENDING') if role=='SEMEN' else ('RICK_AV_PENDING',))
  if not state_ok:raise HTTPException(403,'No assignment for this role')
  row=db.one('SELECT id,kind,stored_name,original_name,sha256,version FROM assets WHERE project_id=? AND id=?',(pid,aid))
  if not row:raise HTTPException(404)
  if role=='RICK' and (row['kind'] not in ('editor_render','editor_srt') or row['version']!=status['version']):raise HTTPException(403)
  if role=='SEMEN' and row['kind'] not in ('source','editor_render','editor_srt'):raise HTTPException(403)
  f=Path(folder)/pid/'assets'/row['stored_name']
  if not f.is_file() or sha_file(f)!=row['sha256']:raise HTTPException(409,'Asset integrity failure')
  return FileResponse(f,filename=row['original_name'])
 @app.post('/api/workers/semen/projects/{pid}/output')
 async def worker_editor_output(pid:str,file:UploadFile=File(...),srt:UploadFile=File(...),editor_job_id:str=Form(...),manifest:str=Form(...),x_shtab_role_token:str|None=Header(None)):
  secure_role('SEMEN',x_shtab_role_token)
  pid_ok(pid)
  if Path(file.filename or '').suffix.lower()!='.mp4':raise HTTPException(400,'MP4 only')
  temp=Path(folder)/pid/('.worker-mp4-'+uuid.uuid4().hex)
  temp_srt=Path(folder)/pid/('.worker-srt-'+uuid.uuid4().hex)
  temp.parent.mkdir(parents=True,exist_ok=True)
  total=0
  try:
   with temp.open('wb') as dst:
    while chunk:=await file.read(1024*1024):
     total+=len(chunk)
     if total>int(os.environ.get('SHTAB_MAX_UPLOAD_BYTES','31457280')):raise HTTPException(413)
     dst.write(chunk)
   data=await srt.read(250_001)
   if len(data)>250_000:raise HTTPException(413)
   temp_srt.write_bytes(data)
   return handle(bridge.accept_editor_render,pid,temp,file.filename,temp_srt,srt.filename or 'captions.srt',editor_job_id,manifest)
  finally:temp.unlink(missing_ok=True);temp_srt.unlink(missing_ok=True);await file.close();await srt.close()
 @app.post('/api/workers/rick/projects/{pid}/review')
 def worker_rick_review(pid:str,payload:ReviewInput,x_shtab_role_token:str|None=Header(None)):
  secure_role('RICK',x_shtab_role_token)
  pid_ok(pid)
  return handle(bridge.submit_review,pid,payload)
 @app.post('/api/projects/{pid}/handoff/rick-review',dependencies=[Depends(auth)])
 def rick_review(pid:str,payload:ReviewInput,x_shtab_role_token:str|None=Header(None)):
  pid_ok(pid);secure_role('RICK',x_shtab_role_token)
  return handle(bridge.submit_review,pid,payload)