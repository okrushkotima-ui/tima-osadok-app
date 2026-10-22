cmake_minimum_required(VERSION 3.22)
project(Sidechain VERSION 0.2.1 LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(MSVC)
  add_compile_options(/utf-8)
endif()
include(FetchContent)
FetchContent_Declare(JUCE GIT_REPOSITORY https://github.com/juce-framework/JUCE.git GIT_TAG 8.0.12 GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(JUCE)
juce_add_plugin(Sidechain
 COMPANY_NAME "тима осадок"
 BUNDLE_ID "audio.timaosadok.sidechain"
 PLUGIN_MANUFACTURER_CODE Tmos
 PLUGIN_CODE Sc01
 FORMATS VST3
 PRODUCT_NAME "Sidechain by тима осадок"
 DESCRIPTION "Volume shaper with audio kick sidechain, MIDI trigger and DAW sync"
 IS_SYNTH FALSE
 NEEDS_MIDI_INPUT TRUE
 NEEDS_MIDI_OUTPUT FALSE
 IS_MIDI_EFFECT FALSE
 COPY_PLUGIN_AFTER_BUILD FALSE
 VST3_CATEGORIES Fx)
target_sources(Sidechain PRIVATE source/PluginProcessor.cpp source/PluginEditor.cpp)
target_compile_definitions(Sidechain PUBLIC JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JUCE_VST3_CAN_REPLACE_VST2=0)
target_link_libraries(Sidechain PRIVATE juce::juce_audio_utils juce::juce_dsp
 PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_warning_flags)
if(MSVC)
 target_compile_options(Sidechain PRIVATE /utf-8)
endif()
enable_testing()
add_executable(sidechain_tests tests/engine_tests.cpp)
target_include_directories(sidechain_tests PRIVATE source)
add_test(NAME sidechain_engine COMMAND sidechain_tests)
