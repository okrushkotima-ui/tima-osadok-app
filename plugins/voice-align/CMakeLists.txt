cmake_minimum_required(VERSION 3.22)
project(VoiceAlign VERSION 0.2.3 LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(MSVC)
  add_compile_options(/utf-8)
endif()
include(FetchContent)
FetchContent_Declare(JUCE GIT_REPOSITORY https://github.com/juce-framework/JUCE.git GIT_TAG 8.0.12 GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(JUCE)
FetchContent_Declare(signalsmith_stretch GIT_REPOSITORY https://github.com/Signalsmith-Audio/signalsmith-stretch.git GIT_TAG 57b93f4e9206a089a45387eaa39bdc9f310d3308)
FetchContent_MakeAvailable(signalsmith_stretch)

# Host timeline access requires the Celemony ARA SDK (not bundled with JUCE).
juce_set_ara_sdk_path("${CMAKE_CURRENT_SOURCE_DIR}/../../external/ARA_SDK")
# Studio One VST3 Event FX often docks large ARA editors into its Edit pane.
# Request a non-embedded VST3 view while retaining the ARA audio/region roles.
# This changes only our fetched JUCE wrapper, not the installed DAW.
set(_vst3_wrapper "${juce_SOURCE_DIR}/modules/juce_audio_plugin_client/juce_audio_plugin_client_VST3.cpp")
file(READ "${_vst3_wrapper}" _vst3_source)
set(_embedded_view_return "return (Steinberg::TBool) dynamic_cast<AudioProcessorARAExtension*> (pluginInstance)->isEditorView();")
if(NOT _vst3_source MATCHES "dynamic_cast<AudioProcessorARAExtension\\*> \\(pluginInstance\\)->isEditorView\\(\\)")
  message(FATAL_ERROR "JUCE VST3 Studio One embedding API signature changed")
endif()
string(REPLACE "${_embedded_view_return}" "return (Steinberg::TBool) false;" _vst3_source "${_vst3_source}")
file(WRITE "${_vst3_wrapper}" "${_vst3_source}")
# JUCE 8.0.12 includes superseded ARAChannelArrangement.cpp; SDK 2.3 has ARAChannelFormat.cpp.
set(_ara_wrapper "${juce_SOURCE_DIR}/modules/juce_audio_plugin_client/juce_audio_plugin_client_ARA.cpp")
set(_ara_sdk_util "${CMAKE_CURRENT_SOURCE_DIR}/../../external/ARA_SDK/ARA_Library/Utilities")
if(EXISTS "${_ara_sdk_util}/ARAChannelFormat.cpp" AND NOT EXISTS "${_ara_sdk_util}/ARAChannelArrangement.cpp")
  file(READ "${_ara_wrapper}" _wrapper_source)
  string(REPLACE "ARAChannelArrangement.cpp" "ARAChannelFormat.cpp" _wrapper_source "${_wrapper_source}")
  file(WRITE "${_ara_wrapper}" "${_wrapper_source}")
endif()

juce_add_plugin(VoiceAlign
  COMPANY_NAME "тима осадок"
  BUNDLE_ID "audio.timaosadok.voicealign"
  PLUGIN_MANUFACTURER_CODE Tmos
  PLUGIN_CODE Va01
  FORMATS VST3
  IS_ARA_EFFECT TRUE
  PRODUCT_NAME "Синхрон by тима осадок"
  IS_SYNTH FALSE
  NEEDS_MIDI_INPUT FALSE
  NEEDS_MIDI_OUTPUT FALSE
  IS_MIDI_EFFECT FALSE
  COPY_PLUGIN_AFTER_BUILD FALSE
  VST3_CATEGORIES Fx)
target_sources(VoiceAlign PRIVATE source/PluginProcessor.cpp source/PluginEditor.cpp source/ARAController.cpp)
target_include_directories(VoiceAlign PRIVATE ${signalsmith_stretch_SOURCE_DIR})
target_compile_definitions(VoiceAlign PUBLIC JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JUCE_VST3_CAN_REPLACE_VST2=0)
target_link_libraries(VoiceAlign PRIVATE signalsmith-stretch juce::juce_audio_utils juce::juce_dsp PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_warning_flags)
if(MSVC)
 target_compile_options(VoiceAlign PRIVATE /utf-8)
endif()
add_executable(voicealign_tests tests/engine_tests.cpp)
target_include_directories(voicealign_tests PRIVATE source ${signalsmith_stretch_SOURCE_DIR})
target_link_libraries(voicealign_tests PRIVATE signalsmith-stretch)
enable_testing()
add_test(NAME voicealign_engine COMMAND voicealign_tests)
