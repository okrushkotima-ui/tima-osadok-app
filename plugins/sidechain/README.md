# Sidechain by тима осадок — Windows VST3 (beta 0.2.1)

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

## New in 0.2.0: real-time KICK SCOPE

- A **teal kick-input waveform** is recorded directly from the actual VST3 secondary sidechain audio bus in realtime, not a sample image, preview, or animation. Kick energy occupies the same horizontal timing axis as the editable ducking curve; waveform is normalized on screen for easy visibility, while peak dB remains numeric.
- A **dashed white line** shows the actual applied gain, allowing comparison with the target yellow curve. A gold trigger line flashes at kick detection, and a moving white playhead tracks the envelope. Tempo-relative cycle length is marked in milliseconds.
- Incoming audio is captured into a fixed-size 384-bin atomic ring-style timeline, reset at each trigger or sync cycle. No locks, dynamic allocations, or GUI calls are made from the audio callback.
- **IMPORTANT:** To see an actual kick waveform you must choose **AUDIO KICK** and route kick track audio to the plugin's sidechain input in Studio One. A tempo-synced plugin that receives no kick audio cannot show an actual kick waveform, so the editor displays an explicit routing hint rather than inventing a fake signal.
- For attack tuning, align the beginning of the gold curve's duck with the teal transient. Shape the rising portion of the gold curve to release as the teal kick tail decays; edit the nine white points. Zero-lookahead still applies.

## Sidechain 0.2.1: immediate kick onset + recovery

- **AUDIO KICK** now always starts the duck envelope at its beginning when the real sidechain kick crosses the sensitivity threshold. The SYNC-only PHASE SHIFT is ignored completely in AUDIO KICK and MIDI, fixing unexpected silent starts/phase wrapping.
- The old AUDIO/MIDI duck duration was controlled by musical LENGTH and could stay suppressed for a quarter note (500 ms at 120 BPM), even with a short kick. Now **RECOVERY** independently sets the active envelope's length from 20 to 600 ms; initial default 120 ms. This is a *shape duration*, so actual return to unity can begin earlier based on user-edited curve. Setting e.g. 80 ms makes recovery short regardless of BPM.
- Faster but smoothed duck-onset (time constant 0.25 ms); original smooth gain restoration retained to avoid clicks.
- **SYNC** still uses the beat LENGTH selector and optionally PHASE SHIFT to offset the groove; the latter is now hidden in AUDIO KICK and MIDI, replaced with RECOVERY. In non-sync modes LENGTH is disabled.
- Default kick sensitivity lowered to -40 dBFS to catch weaker early transients. If a slow attack is detected late, lower the threshold further, verify kick Send is pre-delay/post FX appropriately, and watch the turquoise transient vs gold trigger marker.
- There is no lookahead in v0.2.1. Inserting delay or zero-latency anticipation is impossible: the processor cannot react before an incoming kick is provided by the DAW.
- New DSP regression tests prove audio-trigger latency below 2 ms, fast/slow recovery independently from tempo, MIDI, zero-depth dry path, and unmodified SYNC phase shift at common sample rates.
