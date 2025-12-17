#!/usr/bin/env node
/**
 * Test script to verify the Smithery entry point works locally
 * This simulates what Smithery does when it calls our default export
 */

import('./dist/smithery.js')
  .then(async (module) => {
    console.log('Module loaded successfully');
    console.log('Has default export:', typeof module.default === 'function');
    console.log('Has configSchema:', !!module.configSchema);
    console.log('Has stateless:', module.stateless === true);
    
    // Test with example config (like Smithery would)
    const testConfig = {
      readwiseApiKey: 'test-key-for-scanning',
      debug: true
    };
    
    console.log('\nCalling default export with config:', testConfig);
    
    try {
      const server = module.default({ config: testConfig });
      console.log('\n✓ Server returned successfully');
      console.log('Server type:', typeof server);
      console.log('Server is null:', server === null);
      console.log('Server is undefined:', server === undefined);
      console.log('Server keys:', server ? Object.keys(server).slice(0, 10) : 'N/A');
      
      // Wait a bit for any async logs
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('\n✓ Test completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('\n✗ Error calling default export:');
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('✗ Failed to load module:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
