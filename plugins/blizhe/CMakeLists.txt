cmake_minimum_required(VERSION 3.22)
project(Blizhe VERSION 0.1.1 LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
# Apply UTF-8 to JUCE's generated VST3 wrapper and metadata helper, not only the DSP target.
if(MSVC)
  add_compile_options(/utf-8)
endif()
include(FetchContent)
FetchContent_Declare(JUCE GIT_REPOSITORY https://github.com/juce-framework/JUCE.git GIT_TAG 8.0.12 GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(JUCE)
juce_add_plugin(Blizhe
    COMPANY_NAME "тима осадок"
    BUNDLE_ID "audio.timaosadok.blizhe"
    PLUGIN_MANUFACTURER_CODE Tmos
    PLUGIN_CODE Blzh
    FORMATS VST3
    PRODUCT_NAME "Ближе by тима осадок"
    PLUGIN_NAME "Ближе by тима осадок"
    DESCRIPTION "Ближе by тима осадок - vocal presence"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD FALSE
    VST3_CATEGORIES Fx Dynamics)
target_sources(Blizhe PRIVATE source/PluginProcessor.cpp source/PluginEditor.cpp)
target_compile_definitions(Blizhe PUBLIC JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0 JUCE_VST3_CAN_REPLACE_VST2=0)
target_link_libraries(Blizhe PRIVATE juce::juce_audio_utils juce::juce_dsp PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_warning_flags)
if(MSVC)
  target_compile_options(Blizhe PRIVATE /utf-8)
endif()
add_executable(dsp_tests tests/dsp_tests.cpp)
target_include_directories(dsp_tests PRIVATE source)
enable_testing()
add_test(NAME dsp_invariants COMMAND dsp_tests)
