"""FFmpeg execution adapter for a *separately assigned* SEMEN job.

Executes an explicit in/out selection, re-times supplied SRT, and emits a real
MP4 + SRT + SHA manifest. Does not choose edits or pretend to be the user's
interactive ChatGPT Semyon. No automatic artist approval.
"""
from __future__ import annotations
import argparse, hashlib, json, re, subprocess, time
from pathlib import Path
from .phase02 import probe_video,sha_file,SliceError

SRT_TIME=re.compile(r'(?m)^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})(?:[^\n]*)$')

def millis(s):
 h,m,other=s.replace('.',',').split(':');sec,ms=other.split(',')
 return ((int(h)*60+int(m))*60+int(sec))*1000+int(ms)

def stamp(t):
 t=max(0,int(round(t)));h,t=divmod(t,3600000);m,t=divmod(t,60000);s,ms=divmod(t,1000)
 return f'{h:02}:{m:02}:{s:02},{ms:03}'

def retime_srt(srt_text,start,end):
 blocks=re.split(r'\r?\n\s*\r?\n',srt_text.lstrip('\ufeff').strip());kept=[]
 for block in blocks:
  lines=block.splitlines(); idx=next((i for i,x in enumerate(lines) if SRT_TIME.match(x)),None)
  if idx is None:continue
  hit=SRT_TIME.match(lines[idx]);a=millis(hit[1]);b=millis(hit[2])
  left=max(a,int(round(start*1000)));right=min(b,int(round(end*1000)))
  if right<=left:continue
  subtitles='\n'.join(lines[idx+1:]).strip()
  if not subtitles:continue
  kept.append(f'{len(kept)+1}\n{stamp(left-start*1000)} --> {stamp(right-start*1000)}\n{subtitles}')
 return '\n\n'.join(kept)+'\n' if kept else ''

def run(job,output_dir):
 source=Path(job['source_mp4']).resolve();srt=Path(job['source_srt']).resolve();out=Path(output_dir).resolve()
 clip=job.get('clip_id','clip-1');start=float(job['start_sec']);end=float(job['end_sec'])
 if not source.is_file() or not srt.is_file():raise SliceError('source MP4 and SRT required')
 if start<0 or end-start<1 or end-start>60:raise SliceError('Invalid editing time range')
 original=probe_video(source);duration=float(original['duration'])
 if end>duration+.02:raise SliceError('End exceeds source duration')
 shifted=retime_srt(srt.read_text('utf-8-sig'),start,end)
 if not shifted.strip():raise SliceError('No source captions map to selected range')
 out.mkdir(parents=True,exist_ok=True)
 dest=out/f'{clip}_adapter_v06.mp4';sub=out/f'{clip}_adapter_v06.srt'
 argv=['ffmpeg','-nostdin','-y','-hide_banner','-v','error','-ss',str(start),'-i',str(source),'-t',str(end-start),
  '-map','0:v:0','-map','0:a:0','-vf','scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
  '-c:v','libx264','-preset','veryfast','-crf','19','-c:a','aac','-b:a','160k','-movflags','+faststart',str(dest)]
 started=time.monotonic();proc=subprocess.run(argv,capture_output=True,text=True,timeout=180)
 if proc.returncode:raise SliceError('FFmpeg failed '+proc.stderr[-800:])
 sub.write_text(shifted,encoding='utf-8')
 result={'kind':'FFMPEG_EXECUTION_ONLY_NOT_CHATGPT_AGENT','clip_id':clip,'editor_job_id':job.get('editor_job_id','trial-adapter'),
  'input_sha256':sha_file(source),'source_srt_sha256':sha_file(srt),'start_sec':start,'end_sec':end,
  'output_mp4':str(dest),'output_mp4_sha256':sha_file(dest),'output_srt':str(sub),'output_srt_sha256':sha_file(sub),
  'ffmpeg_exit_code':proc.returncode,'elapsed_ms':round((time.monotonic()-started)*1000),
  'video_probe':probe_video(dest),'actual_rick_av_review':False,'real_chatgpt_semyon_plugin_invoked':False,'publish_api':'DISABLED'}
 (out/'render_manifest_v06.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 return result

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('job_json');a.add_argument('output_dir');o=a.parse_args()
 print(json.dumps(run(json.loads(Path(o.job_json).read_text('utf-8')),o.output_dir),ensure_ascii=False,indent=2))