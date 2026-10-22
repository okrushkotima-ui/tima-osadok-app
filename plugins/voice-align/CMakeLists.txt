cmake_minimum_required(VERSION 3.22)
project(VoiceAlign VERSION 0.1.0 LANGUAGES C CXX)
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
juce_add_plugin(VoiceAlign
  COMPANY_NAME "тима осадок"
  BUNDLE_ID "audio.timaosadok.voicealign"
  PLUGIN_MANUFACTURER_CODE Tmos
  PLUGIN_CODE Va01
  FORMATS VST3
  PRODUCT_NAME "Синхрон by тима осадок"
  IS_SYNTH FALSE
  NEEDS_MIDI_INPUT FALSE
  NEEDS_MIDI_OUTPUT FALSE
  IS_MIDI_EFFECT FALSE
  COPY_PLUGIN_AFTER_BUILD FALSE
  VST3_CATEGORIES Fx)
target_sources(VoiceAlign PRIVATE source/PluginProcessor.cpp source/PluginEditor.cpp)
target_include_directories(VoiceAlign PRIVATE ${signalsmith_stretch_SOURCE_DIR})
target_compile_definitions(VoiceAlign PUBLIC JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JUCE_VST3_CAN_REPLACE_VST2=0)
target_link_libraries(VoiceAlign PRIVATE juce::juce_audio_utils juce::juce_dsp PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_warning_flags)
if(MSVC)
 target_compile_options(VoiceAlign PRIVATE /utf-8)
endif()
add_executable(voicealign_tests tests/engine_tests.cpp)
target_include_directories(voicealign_tests PRIVATE source ${signalsmith_stretch_SOURCE_DIR})
enable_testing()
add_test(NAME voicealign_engine COMMAND voicealign_tests)
