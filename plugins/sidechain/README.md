# Sidechain by тима осадок — Windows VST3 (beta 0.1.0)

An original C++/JUCE 8 volume-shaper effect. Workflow inspired by Kickstart 2, without copying source or artwork.

Modes:
- SYNC: tempo-locked pumping without sidechain sends, various beat lengths.
- AUDIO KICK: real secondary VST3 audio input. Send kick audio to restart the duck envelope on detected transients; when no kick is sent the sound passes unattenuated.
- MIDI: incoming MIDI note-on messages trigger volume ducking where the host supports MIDI routing to audio plugins.

Nine draggable curve points and four presets (PUNCH / SMOOTH / GROOVE / REVERSE), Depth, Mix, Length, Kick Threshold, Phase Shift, Bass Only, cutoff frequency, kick and duck meters. Plugin state is persisted with DAW project. Sub-millisecond smoothing; no lookahead, no added algorithmic latency.

STUDIO ONE:
1. Close Studio One and install the Windows 64-bit executable.
2. Open Studio One and insert Sidechain by тима осадок on bass, synth, pad or melody track as a regular INSERT effect. Do not use Event FX.
3. SYNC mode works instantly. Start with Length 1/4, Depth 100%, Mix 100%, PUNCH or SMOOTH curve.
4. For actual kick-following ducking select AUDIO KICK, enable the plug-in's Sidechain button in Studio One's insert header, then send the kick audio track to the Sidechain input of our plug-in. Adjust Kick Threshold until the KICK meter responds.
5. MIDI mode requires the host to route note-on events into an audio FX plugin. If unavailable, use SYNC or AUDIO KICK.
6. BASS ONLY leaves most highs untouched and ducks mainly below the adjustable cutoff; disable for ordinary full-band pumping.

The Windows VST3 bundle is installed under the standard Common Files/VST3/тима осадок directory. The UI has been implemented in JUCE and is separate from Kickstart 2's original artwork. This beta requires host-level listening tests, including kick-send detection.
