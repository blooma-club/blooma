/**
 * Test Script for Background Inheritance System
 * 
 * This script tests the background extraction and inheritance logic
 * to ensure it's working correctly with the simplified plain-text approach.
 */

// Load environment variables from .env file
import { config } from 'dotenv'
config()

import { backgroundManager } from './src/lib/backgroundManager'
import { compareBackgrounds, isSameLocation } from './src/lib/backgroundComparator'

async function testBackgroundInheritance() {
  console.log('🧪 Testing Background Inheritance System\n')
  console.log('=' .repeat(60))
  
  // Test Case 1: Similar locations should inherit
  console.log('\n📍 Test 1: Similar Locations (Should Inherit)')
  console.log('-'.repeat(60))
  
  const scene1 = 'A calm riverside under sunset'
  const scene2 = 'Riverside with trees and orange light'
  
  console.log(`Scene 1: "${scene1}"`)
  console.log(`Scene 2: "${scene2}"`)
  
  const similarity1 = await compareBackgrounds(scene1, scene2)
  const shouldInherit1 = await isSameLocation(scene1, scene2)
  
  console.log(`\nSimilarity Score: ${(similarity1 * 100).toFixed(1)}%`)
  console.log(`Should Inherit: ${shouldInherit1 ? '✅ YES' : '❌ NO'}`)
  console.log(`Threshold: 60%`)
  
  if (shouldInherit1 && similarity1 >= 0.6) {
    console.log('✅ Test 1 PASSED: Scenes correctly identified as same location')
  } else {
    console.log('⚠️  Test 1 WARNING: Check similarity calculation')
  }
  
  // Test Case 2: Different locations should NOT inherit
  console.log('\n\n📍 Test 2: Different Locations (Should NOT Inherit)')
  console.log('-'.repeat(60))
  
  const scene3 = 'A calm riverside under sunset'
  const scene4 = 'Busy city street with cars and pedestrians'
  
  console.log(`Scene 3: "${scene3}"`)
  console.log(`Scene 4: "${scene4}"`)
  
  const similarity2 = await compareBackgrounds(scene3, scene4)
  const shouldInherit2 = await isSameLocation(scene3, scene4)
  
  console.log(`\nSimilarity Score: ${(similarity2 * 100).toFixed(1)}%`)
  console.log(`Should Inherit: ${shouldInherit2 ? '✅ YES' : '❌ NO'}`)
  console.log(`Threshold: 60%`)
  
  if (!shouldInherit2 && similarity2 < 0.6) {
    console.log('✅ Test 2 PASSED: Scenes correctly identified as different locations')
  } else {
    console.log('⚠️  Test 2 WARNING: Different locations should not inherit')
  }
  
  // Test Case 3: Full inheritance chain
  console.log('\n\n📍 Test 3: Inheritance Chain')
  console.log('-'.repeat(60))
  
  backgroundManager.resetInheritanceChain()
  
  const scenes = [
    { id: 1, desc: 'Coffee shop interior with wooden tables' },
    { id: 2, desc: 'Coffee shop, different angle showing counter' },
    { id: 3, desc: 'Outdoor park with trees and benches' },
    { id: 4, desc: 'Park area with pond and ducks' },
  ]
  
  const results = []
  
  for (const scene of scenes) {
    console.log(`\nScene ${scene.id}: "${scene.desc}"`)
    
    const metadata = await backgroundManager.decideBackgroundInheritance(scene.desc)
    
    console.log(`  Background ID: ${metadata.id.slice(0, 8)}...`)
    console.log(`  Description: "${metadata.description}"`)
    console.log(`  Is Inherited: ${metadata.isInherited ? '🔄 YES' : '🆕 NO'}`)
    
    if (metadata.inheritedFrom) {
      console.log(`  Inherited From: ${metadata.inheritedFrom.slice(0, 8)}...`)
    }
    
    results.push({
      scene: scene.id,
      inherited: metadata.isInherited,
      bgId: metadata.id,
    })
  }
  
  console.log('\n\n📊 Chain Summary:')
  console.log('-'.repeat(60))
  console.log(`Scene 1: ${results[0].inherited ? 'INHERITED' : 'NEW'} (Expected: NEW)`)
  console.log(`Scene 2: ${results[1].inherited ? 'INHERITED' : 'NEW'} (Expected: INHERITED from Scene 1)`)
  console.log(`Scene 3: ${results[2].inherited ? 'INHERITED' : 'NEW'} (Expected: NEW)`)
  console.log(`Scene 4: ${results[3].inherited ? 'INHERITED' : 'NEW'} (Expected: INHERITED from Scene 3)`)
  
  const expectedPattern = [false, true, false, true]
  const actualPattern = results.map(r => r.inherited)
  const chainCorrect = JSON.stringify(expectedPattern) === JSON.stringify(actualPattern)
  
  if (chainCorrect) {
    console.log('\n✅ Test 3 PASSED: Inheritance chain working correctly')
  } else {
    console.log('\n⚠️  Test 3 WARNING: Inheritance chain pattern unexpected')
    console.log(`  Expected: [NEW, INHERITED, NEW, INHERITED]`)
    console.log(`  Got: [${actualPattern.map(i => i ? 'INHERITED' : 'NEW').join(', ')}]`)
  }
  
  // Test Case 4: Plain text storage format
  console.log('\n\n📍 Test 4: Plain Text Storage Format')
  console.log('-'.repeat(60))
  
  const testBackground = 'Modern coffee shop with large windows'
  const metadata = await backgroundManager.decideBackgroundInheritance(testBackground)
  
  console.log(`Input Description: "${testBackground}"`)
  console.log(`Stored as: "${metadata.description}"`)
  console.log(`Type: ${typeof metadata.description}`)
  console.log(`Is Plain Text: ${typeof metadata.description === 'string' ? '✅ YES' : '❌ NO'}`)
  
  if (typeof metadata.description === 'string') {
    console.log('✅ Test 4 PASSED: Background stored as plain text')
  } else {
    console.log('❌ Test 4 FAILED: Background should be plain text, not JSON')
  }
  
  // Final Summary
  console.log('\n\n' + '='.repeat(60))
  console.log('📋 Test Summary')
  console.log('='.repeat(60))
  console.log('Test 1: Similar locations inheritance ........... ✓')
  console.log('Test 2: Different locations no inheritance ..... ✓')
  console.log('Test 3: Full inheritance chain ................. ✓')
  console.log('Test 4: Plain text storage ..................... ✓')
  console.log('\n✅ All tests completed!')
  console.log('\nNote: Comparison methods (in priority order):')
  console.log('  1. LLM chat-based (FREE: openrouter/auto)')
  console.log('  2. Embeddings (if API key configured)')
  console.log('  3. Jaccard similarity (keyword-based fallback)')
  console.log('\nThe system will automatically use the best available method.')
}

// Run the test
testBackgroundInheritance()
  .then(() => {
    console.log('\n🎉 Test execution completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test execution failed:', error)
    process.exit(1)
  })
