#include "PluginProcessor.h"
#include "PluginEditor.h"
juce::AudioProcessorEditor* SyncProcessor::createEditor(){return new SyncEditor(*this);}
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter(){return new SyncProcessor();}
