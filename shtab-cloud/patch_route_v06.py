"""Patch verified legacy v0.4 ZIP at Docker build to attach role transport v0.6.
Version-gated. Does not change owner auth or existing UI/CSP policy.
"""
from pathlib import Path
import sys
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path('/app')
app=root/'server'/'app_v04.py'
phase=root/'server'/'phase02.py'
a=app.read_text('utf-8');p=phase.read_text('utf-8')
oldapp=" @app.post('/api/worker/once',dependencies=[Depends(auth)])\n def run_once():return coord.process_one() or {'status':'idle'}\n return app\n"
newapp=" @app.post('/api/worker/once',dependencies=[Depends(auth)])\n def run_once():return coord.process_one() or {'status':'idle'}\n from .handoff_v06 import attach_bridge\n attach_bridge(app,coord,db,folder,auth)\n return app\n"
if a.count(oldapp)==1:
 a=a.replace(oldapp,newapp,1)
elif a.count(newapp)!=1:
 raise RuntimeError('Server app changed; cannot patch safely')
oldphase="""    if role=='JOHN':
     self.db.state(c,pid,'RICK_PENDING')
     self.db.queue(c,pid,'AGENT_RICK',{'purpose':'initial','evidence_hash':evidence['evidence_sha256']},'v02:rick:'+evidence['evidence_sha256'])
    else:
"""
newphase="""    if role=='JOHN':
     v06_enabled=os.environ.get('SHTAB_ROLE_ROUTE_V06','')=='1'
     managed=bool(c.execute('SELECT 1 FROM sqlite_master WHERE type="table" AND name="fullcycle_meta"').fetchone()
       and c.execute('SELECT project_id FROM fullcycle_meta WHERE project_id=?',(pid,)).fetchone())
     if v06_enabled and managed:
      if verified:
       # The role bridge is created at app startup, and only the trusted real
       # provider branch above can route here. No extra up-front RICK call.
       if not c.execute('SELECT 1 FROM sqlite_master WHERE type="table" AND name="bridge_v06"').fetchone():
        raise SliceError('Role bridge not initialized')
       stamp=time.time()
       c.execute('INSERT OR IGNORE INTO bridge_v06(project_id,state,opened_at,updated_at) VALUES(?,?,?,?)',
        (pid,'WAITING_FOR_SEMEN',stamp,stamp))
       if c.execute('SELECT COUNT(*) FROM bridge_handoffs WHERE project_id=?',(pid,)).fetchone()[0]==0:
        c.execute('INSERT INTO bridge_handoffs(id,project_id,seq,from_actor,to_actor,action,version,asset_sha256,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
         (str(uuid.uuid4()),pid,1,'JOHN','SEMEN','VERIFIED_BRIEF_TO_EDITOR',0,evidence['evidence_sha256'],
          json.dumps({'response_id':response_id,'strategy_sha256':hashlib.sha256(resp['text'].encode()).hexdigest(),
           'source_evidence_sha256':evidence['evidence_sha256']},ensure_ascii=False),stamp))
        self.db.event(c,pid,'JOHN','VERIFIED_BRIEF_TO_EDITOR',artifact_sha256=evidence['evidence_sha256'],
         detail={'to':'SEMEN','response_id':response_id})
       self.db.state(c,pid,'WAITING_FOR_SEMEN')
      else:
       self.db.state(c,pid,'TEST_COMPLETE_NOT_VERIFIED')
       self.db.event(c,pid,'COORDINATOR','UNVERIFIED_JOHN_NO_EDITOR_HANDOFF',detail={'no_genuine_model_response':True})
     else:
      self.db.state(c,pid,'RICK_PENDING')
      self.db.queue(c,pid,'AGENT_RICK',{'purpose':'initial','evidence_hash':evidence['evidence_sha256']},'v02:rick:'+evidence['evidence_sha256'])
    else:
"""
if p.count(oldphase)!=1:raise RuntimeError('Phase02 unexpected change; cannot patch safely')
p=p.replace(oldphase,newphase,1)
app.write_text(a,encoding='utf-8');phase.write_text(p,encoding='utf-8')
print('V0.6 role transfer routes installed; feature flag required, no model key configured or spent')