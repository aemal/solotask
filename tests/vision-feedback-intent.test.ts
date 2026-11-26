import test from 'node:test';
import assert from 'node:assert/strict';
import { feedbackTakeoverIntent } from '../lib/vision-feedback-intent';

test('explicit selected-round takeover instructions are recognised', () => {
  for (const text of [
    'These are my reviews, please take it over.',
    'Go ahead and work on this package.',
    'Give these tasks to the team.',
    'Samantha, please take over these reviews.',
    'Okay, assign these tickets to our team.',
    'Start working on this round.',
    'Let’s work on these tickets.',
    'I have reviewed this package. Please implement it.',
    'Yes, please hand this feedback over to the team.',
  ]) assert.equal(feedbackTakeoverIntent(text), true, text);
});

test('questions, negatives, readiness and deferred instructions never authorise work', () => {
  for (const text of [
    'Do not take it over.', "Don't start working on this package.",
    'Please take it over, but not yet.', 'Never assign these tickets to the team.',
    'Can you take it over?', 'Can you take it over',
    'Should we give these tasks to the team', 'Are you ready to work on this package?',
    'This package is ready.', 'I have reviewed this.', 'Looks good to me.', 'Yes.',
    'Take it over tomorrow.', 'Before you take it over, explain the plan.',
    'If it looks good, take it over.', 'Wait, give these tasks to the team later.',
    'Samantha said take it over.', 'For example, “give these tasks to the team”.',
    'What happens when I say take it over?', 'I wonder whether you can take it over.',
    'I am ready to take it over.', 'I will take it over.', 'Explain how to take it over.', 'Please start the call.', 'Please fix my microphone.', '',
  ]) assert.equal(feedbackTakeoverIntent(text), false, text);
});
