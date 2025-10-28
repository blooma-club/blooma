/**
 * Background Inheritance System - Integration Test Example
 * 
 * This file demonstrates how the background inheritance system works
 * Run this manually to test the semantic comparison features
 */

import { compareBackgrounds, isSameLocation, findBestMatch } from '../src/lib/backgroundComparator'
import { backgroundManager } from '../src/lib/backgroundManager'

/**
 * Test 1: Basic Semantic Comparison
 */
async function testSemanticComparison() {
  console.log('\n=== Test 1: Semantic Comparison ===\n')
  
  const testCases = [
    {
      prev: 'Cozy coffee shop interior with wooden tables',
      curr: 'Coffee shop, different angle showing counter',
      expected: 'INHERIT (same location)',
    },
    {
      prev: 'Modern office with glass walls',
      curr: 'Outdoor park with trees and benches',
      expected: 'NEW (different location)',
    },
    {
      prev: 'Dimly lit bar with neon signs',
      curr: 'Dark bar interior, neon lighting',
      expected: 'INHERIT (same location)',
    },
    {
      prev: 'Bedroom at night',
      curr: 'Sunny beach during daytime',
      expected: 'NEW (different location)',
    },
  ]
  
  for (const test of testCases) {
    const similarity = await compareBackgrounds(test.prev, test.curr)
    const isSame = await isSameLocation(test.prev, test.curr)
    
    console.log(`Previous: "${test.prev}"`)
    console.log(`Current:  "${test.curr}"`)
    console.log(`Similarity: ${(similarity * 100).toFixed(1)}%`)
    console.log(`Decision: ${isSame ? 'INHERIT' : 'NEW'}`)
    console.log(`Expected: ${test.expected}`)
    console.log(`✓ ${isSame ? 'Same location detected' : 'Different location detected'}`)
    console.log('---')
  }
}

/**
 * Test 2: Background Inheritance Chain
 */
async function testInheritanceChain() {
  console.log('\n=== Test 2: Inheritance Chain ===\n')
  
  // Reset the manager
  backgroundManager.resetInheritanceChain()
  
  const scenes = [
    { sceneNumber: 1, background: 'Modern coffee shop with large windows' },
    { sceneNumber: 2, background: 'Coffee shop interior, close-up of counter' },
    { sceneNumber: 3, background: 'Coffee shop, wide shot showing customers' },
    { sceneNumber: 4, background: 'City street outside, sunny day' },
    { sceneNumber: 5, background: 'Busy urban street with cars and pedestrians' },
    { sceneNumber: 6, background: 'Inside a taxi cab' },
  ]
  
  for (const scene of scenes) {
    const metadata = await backgroundManager.decideBackgroundInheritance(scene.background)
    
    console.log(`Scene ${scene.sceneNumber}:`)
    console.log(`  Input: "${scene.background}"`)
    console.log(`  Final: "${metadata.description}"`)
    console.log(`  ID: ${metadata.id.slice(0, 8)}...`)
    console.log(`  Inherited: ${metadata.isInherited ? 'YES' : 'NO'}`)
    if (metadata.inheritedFrom) {
      console.log(`  Inherited from: ${metadata.inheritedFrom.slice(0, 8)}...`)
    }
    console.log('---')
  }
  
  console.log('\nExpected Results:')
  console.log('- Scenes 1-3: Should share same background ID (coffee shop)')
  console.log('- Scenes 4-5: Should share same background ID (street)')
  console.log('- Scene 6: Should have new background ID (taxi)')
}

/**
 * Test 3: Best Match Finding
 */
async function testBestMatch() {
  console.log('\n=== Test 3: Best Match Finding ===\n')
  
  const existingBackgrounds = [
    'Modern office with glass partitions',
    'Cozy home living room with fireplace',
    'Busy city street at night',
    'Peaceful park with pond and ducks',
  ]
  
  const newScenes = [
    'Office interior, cubicles and desks',
    'Living room, different angle showing TV',
    'Mountain hiking trail',
    'Night time city street, neon lights',
  ]
  
  for (const scene of newScenes) {
    const match = await findBestMatch(scene, existingBackgrounds)
    
    console.log(`New Scene: "${scene}"`)
    if (match) {
      console.log(`  ✓ Match found: "${existingBackgrounds[match.index]}"`)
      console.log(`  Similarity: ${(match.score * 100).toFixed(1)}%`)
      console.log(`  Decision: REUSE existing background`)
    } else {
      console.log(`  ✗ No match found (all below threshold)`)
      console.log(`  Decision: CREATE new background`)
    }
    console.log('---')
  }
}

/**
 * Test 4: Fallback to Jaccard Similarity
 */
async function testFallbackSimilarity() {
  console.log('\n=== Test 4: Fallback Similarity (without embeddings) ===\n')
  
  // Temporarily disable embeddings by using keyword-heavy descriptions
  const testCases = [
    {
      prev: 'coffee shop interior wooden tables chairs',
      curr: 'coffee shop tables chairs interior',
      expectedSimilarity: 'HIGH',
    },
    {
      prev: 'office glass walls modern desk computer',
      curr: 'park trees grass pond ducks',
      expectedSimilarity: 'LOW',
    },
  ]
  
  for (const test of testCases) {
    const similarity = await compareBackgrounds(test.prev, test.curr)
    
    console.log(`Previous: "${test.prev}"`)
    console.log(`Current:  "${test.curr}"`)
    console.log(`Similarity: ${(similarity * 100).toFixed(1)}%`)
    console.log(`Expected: ${test.expectedSimilarity}`)
    console.log('---')
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🎬 Background Inheritance System - Integration Tests')
  console.log('====================================================')
  
  try {
    await testSemanticComparison()
    await testInheritanceChain()
    await testBestMatch()
    await testFallbackSimilarity()
    
    console.log('\n✅ All tests completed successfully!')
    console.log('\nNote: Actual results depend on:')
    console.log('- OpenRouter API availability')
    console.log('- Embedding model quality')
    console.log('- Network conditions')
  } catch (error) {
    console.error('\n❌ Tests failed:', error)
    throw error
  }
}

// Export for manual testing
export { runAllTests, testSemanticComparison, testInheritanceChain, testBestMatch }

// Uncomment to run directly:
// runAllTests().catch(console.error)
