# ближе — by тима осадок
Work in progress: Windows x64 VST3 for vocal distance. Not yet verified in Studio One.

The bipolar amount knob defaults to zero. Negative values soften presence and dynamics; positive values add compression, mid focus and saturation. Mix blends latency-compensated dry and wet. Optional Beat input modulates processing intensity. Double-click amount to reset to zero.

DSP invariants cover mono/stereo, 44.1/48/96 kHz, zero passthrough, silence, automation across both directions, distance spectral change and sidechain response. These do not replace listening tests or host validation.

Build with CMake 3.22+, C++17 and JUCE 8.0.12. JUCE is obtained by FetchContent under its own licensing terms. Plugin source is provided under AGPL-3.0-or-later; see https://www.gnu.org/licenses/agpl-3.0.html . Artwork remains the creator's property.
