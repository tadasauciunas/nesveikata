import './style.css'

document.querySelector('#app').innerHTML = `
  <div class="game-container">
    <h1>Atimk iš babos palikimą!</h1>
    <div class="score-board">
      <div>Lygis: <span id="level">1</span></div>
      <div><span id="progress">0</span>%</div>
    </div>
    <canvas id="gameCanvas" width="800" height="250"></canvas>
    <div class="controls">
      <p>Spaudinėk ← →, kad atimtum iš babos palikimą!</p>
    </div>
  </div>
`

const canvas = document.getElementById('gameCanvas')
const ctx = canvas.getContext('2d')
const levelEl = document.getElementById('level')
const progressEl = document.getElementById('progress')

let frameCount = 0
let level = 1
let pullbackForce = 0.3 // Grandma constantly pulls back (easier starting level)
let levelUpMessageTime = 0 // Track when to show level up message

// Game objects
const kid = {
  x: 620,
  y: 90,
  width: 40,
  height: 60,
  velocity: 0,
  baseSpeed: 1.2,
}

const grandma = {
  x: 720,
  y: 90,
  width: 50,
  height: 80,
}

const bag = {
  width: 30,
  height: 25,
}

// Load SVG images
const kidImage = new Image()
kidImage.src = 'kid.svg'

const grandmaImage = new Image()
grandmaImage.src = 'grandma.svg'

const moneybagImage = new Image()
moneybagImage.src = 'moneybag.svg'

let imagesLoaded = 0
const totalImages = 3

kidImage.onload = () => { imagesLoaded++ }
grandmaImage.onload = () => { imagesLoaded++ }
moneybagImage.onload = () => { imagesLoaded++ }

// Mashing mechanic tracking
let lastKeyPressed = null
let mashPower = 0 // Accumulated mash power

// Event listeners - detect actual key presses for alternation
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    
    // Ignore key repeats (when key is held down)
    if (e.repeat) return
    
    // Check if this is an alternating key press
    if (lastKeyPressed !== e.key) {
      lastKeyPressed = e.key
      mashPower += 4.0 // Give a boost for each valid alternating press
    }
  }
})

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
  }
})


function drawKid() {
  if (imagesLoaded >= totalImages) {
    ctx.drawImage(kidImage, kid.x - 20, kid.y - 10, 80, 80)
  }
}

function drawBag() {
  // Bag position follows the kid (tug-of-war) - closer to kid
  const bagX = kid.x + kid.width + 5
  const bagY = grandma.y + 35
  
  // Grandma's hand position (for arm)
  const grandmaHandX = grandma.x + 20
  const grandmaHandY = grandma.y + 47.5
  
  // Draw arm from moneybag to grandma's fist FIRST
  // First draw black border
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 12
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(bagX + 30, bagY + 15)
  ctx.lineTo(grandmaHandX, grandmaHandY)
  ctx.stroke()
  
  // Then draw skin-colored arm on top
  ctx.strokeStyle = '#f4d7b5'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(bagX + 30, bagY + 15)
  ctx.lineTo(grandmaHandX, grandmaHandY)
  ctx.stroke()
  
  // Draw moneybag SVG on top of the arm
  if (imagesLoaded >= totalImages) {
    ctx.drawImage(moneybagImage, bagX - 10, bagY - 10, 50, 50)
  }
}

function drawGrandma() {
  // Draw the SVG image
  if (imagesLoaded >= totalImages) {
    ctx.drawImage(grandmaImage, grandma.x - 30, grandma.y - 30, 100, 100)
  }
}


function updateKid() {
  // Apply mash power to velocity (pulling left = negative velocity)
  if (mashPower > 0) {
    kid.velocity -= mashPower * 0.15 // Increased to overcome grandma
    mashPower *= 0.90 // Decay moderately - need to keep mashing but can build up
  }
  
  // Grandma constantly pulls back (to the right)
  const currentPullback = pullbackForce * (1 + level * 0.035) // Very gradual scaling
  kid.velocity += currentPullback
  
  // Apply moderate damping
  kid.velocity *= 0.96
  
  // Cap velocity to prevent zooming
  kid.velocity = Math.max(-2, Math.min(2, kid.velocity))
  
  // Update position
  kid.x += kid.velocity
  
  // Boundaries - can't go past grandma on the right
  if (kid.x > 620) {
    kid.x = 620
    kid.velocity = Math.max(0, kid.velocity)
  }
  
  // Check if pulled far enough left (win condition)
  const winDistance = 150 // Fixed distance for all levels
  if (kid.x <= winDistance) {
    levelUp()
  }
  
  // Update progress bar
  const startX = 620
  const targetX = 150
  const currentProgress = startX - kid.x
  const totalDistance = startX - targetX
  const progress = Math.min(100, Math.max(0, Math.floor((currentProgress / totalDistance) * 100)))
  progressEl.textContent = progress
}

function levelUp() {
  level++
  levelEl.textContent = level
  
  // Reset position back to grandma
  kid.x = 620
  kid.velocity = 0
  
  // Reset mashing tracking
  lastKeyPressed = null
  mashPower = 0
  
  // Increase difficulty - grandma pulls harder (but very gradually)
  pullbackForce += 0.025
  
  // Show level up message for 60 frames (1 second)
  levelUpMessageTime = 60
}

function gameLoop() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // Draw background (grey like Chrome dino)
  ctx.fillStyle = '#d9d9d9'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Draw win line (goal line on the left)
  const winDistance = 150 // Fixed distance for all levels
  ctx.strokeStyle = '#555'
  ctx.lineWidth = 4
  ctx.setLineDash([10, 10])
  ctx.beginPath()
  ctx.moveTo(winDistance, 0)
  ctx.lineTo(winDistance, canvas.height)
  ctx.stroke()
  ctx.setLineDash([])
  
  updateKid()
  
  // Draw game objects
  drawBag()
  drawKid()
  drawGrandma()
  
  // Draw level up message if active
  if (levelUpMessageTime > 0) {
    ctx.save()
    ctx.fillStyle = 'rgba(255, 215, 0, 0.9)'
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 3
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.strokeText('Lygis ' + level + '!', canvas.width / 2, canvas.height / 2)
    ctx.fillText('Lygis ' + level + '!', canvas.width / 2, canvas.height / 2)
    ctx.restore()
    levelUpMessageTime--
  }
  
  frameCount++
  requestAnimationFrame(gameLoop)
}

// Start the animation loop
gameLoop()
