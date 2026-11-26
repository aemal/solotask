const test = require('node:test'); const assert = require('node:assert/strict');
const {normalizedPoint,allowedURL}=require('./geometry.cjs');
test('pointer normalization handles a display left of primary',()=>{assert.deepEqual(normalizedPoint({x:-960,y:540},{x:-1920,y:0,width:1920,height:1080}),{x:.5,y:.5});assert.equal(normalizedPoint({x:10,y:10},{x:-1920,y:0,width:1920,height:1080}),null);});
test('native bridge only trusts exact loopback capture renderer',()=>{assert.equal(allowedURL('http://127.0.0.1:3015/vision/capture','http://127.0.0.1:3015'),true);for(const url of ['http://evil.test/vision/capture','http://127.0.0.1:3015/vision/team','http://127.0.0.1:3015.evil.test/vision/capture']) assert.equal(allowedURL(url,'http://127.0.0.1:3015'),false);});
