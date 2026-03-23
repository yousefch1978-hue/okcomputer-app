// Secret Admin Rigging System
// Only accessible to admin users via Command+L (Mac) or Ctrl+L (Windows)

(function() {
  'use strict';
  
  // Check if user is admin
  const isAdmin = () => {
    try {
      const storage = localStorage.getItem('auth-storage');
      if (!storage) return false;
      const parsed = JSON.parse(storage);
      const user = parsed?.state?.user;
      return user?.role === 'admin' || user?.email === 'yousefch1978@gmail.com';
    } catch (e) {
      return false;
    }
  };

  // Admin rigging state
  window.adminRigging = {
    enabled: false,
    
    // Mines
    minesPosition: null, // Array of mine positions (0-24)
    
    // Coin Flip
    coinFlipResult: null, // 'heads' or 'tails'
    
    // Crash
    crashMultiplier: null, // Number like 2.5, 5.0, etc.
    
    // Dice
    diceRoll: null, // Number 0-100 for dice roll
    
    // Blackjack
    blackjackResult: null, // 'win', 'loss', 'blackjack', 'push'
    
    // Tower
    towerResult: null, // 'win' or 'loss'
    towerPositions: null, // Array of mine positions per row [0, 1, 2, ...]
    
    // Toggle rigging mode
    toggle: function() {
      if (!isAdmin()) {
        console.log('🔒 Access denied: Admin only');
        return false;
      }
      this.enabled = !this.enabled;
      if (this.enabled) {
        this.showPanel();
        console.log('✅ Admin Rigging ENABLED');
      } else {
        this.hidePanel();
        console.log('❌ Admin Rigging DISABLED');
      }
      return this.enabled;
    },
    
    // Show control panel
    showPanel: function() {
      let panel = document.getElementById('admin-rig-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'admin-rig-panel';
        panel.innerHTML = `
          <div id="admin-rig-content" style="position:fixed;top:10px;right:10px;width:320px;max-height:90vh;overflow-y:auto;background:#1a1a1a;border:2px solid #00ff87;border-radius:12px;padding:12px;z-index:999999;box-shadow:0 0 30px rgba(0,255,135,0.3);font-family:sans-serif;color:#fff;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <h3 style="color:#00ff87;margin:0;font-size:14px;">🎛️ Admin Rigging</h3>
              <button id="rig-close" style="background:#ff4444;color:white;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;">✕</button>
            </div>
            
            <!-- Mines -->
            <div style="margin-bottom:10px;padding:8px;background:#0f0f0f;border-radius:6px;">
              <h4 style="color:#00ff87;margin:0 0 6px 0;font-size:11px;">💣 Mines</h4>
              <label style="color:#888;font-size:10px;display:block;margin-bottom:4px;">Mine Positions (0-24):</label>
              <input type="text" id="rig-mines" placeholder="e.g. 5,12,18" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;padding:5px;border-radius:4px;font-size:10px;box-sizing:border-box;">
            </div>
            
            <!-- Coin Flip -->
            <div style="margin-bottom:10px;padding:8px;background:#0f0f0f;border-radius:6px;">
              <h4 style="color:#00ff87;margin:0 0 6px 0;font-size:11px;">🪙 Coin Flip</h4>
              <label style="color:#888;font-size:10px;display:block;margin-bottom:4px;">Result:</label>
              <select id="rig-coin" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;padding:5px;border-radius:4px;font-size:10px;">
                <option value="">Random</option>
                <option value="heads">Heads</option>
                <option value="tails">Tails</option>
              </select>
            </div>
            
            <!-- Crash -->
            <div style="margin-bottom:10px;padding:8px;background:#0f0f0f;border-radius:6px;">
              <h4 style="color:#00ff87;margin:0 0 6px 0;font-size:11px;">🚀 Crash</h4>
              <label style="color:#888;font-size:10px;display:block;margin-bottom:4px;">Crash Multiplier:</label>
              <input type="number" id="rig-crash" placeholder="e.g. 2.5" step="0.01" min="1.01" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;padding:5px;border-radius:4px;font-size:10px;box-sizing:border-box;">
            </div>
            
            <!-- Dice -->
            <div style="margin-bottom:10px;padding:8px;background:#0f0f0f;border-radius:6px;">
              <h4 style="color:#00ff87;margin:0 0 6px 0;font-size:11px;">🎲 Dice</h4>
              <label style="color:#888;font-size:10px;display:block;margin-bottom:4px;">Roll (0-100):</label>
              <input type="number" id="rig-dice" placeholder="e.g. 75.50" step="0.01" min="0" max="100" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;padding:5px;border-radius:4px;font-size:10px;box-sizing:border-box;">
            </div>
            
            <!-- Blackjack -->
            <div style="margin-bottom:10px;padding:8px;background:#0f0f0f;border-radius:6px;">
              <h4 style="color:#00ff87;margin:0 0 6px 0;font-size:11px;">♠️ Blackjack</h4>
              <label style="color:#888;font-size:10px;display:block;margin-bottom:4px;">Force Result:</label>
              <select id="rig-blackjack" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;padding:5px;border-radius:4px;font-size:10px;">
                <option value="">Random</option>
                <option value="win">Player Win</option>
                <option value="loss">Player Loss</option>
                <option value="blackjack">Player Blackjack</option>
                <option value="push">Push</option>
              </select>
            </div>
            
            <!-- Tower -->
            <div style="margin-bottom:10px;padding:8px;background:#0f0f0f;border-radius:6px;">
              <h4 style="color:#00ff87;margin:0 0 6px 0;font-size:11px;">🏰 Tower</h4>
              <label style="color:#888;font-size:10px;display:block;margin-bottom:4px;">Force Result:</label>
              <select id="rig-tower-result" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;padding:5px;border-radius:4px;font-size:10px;margin-bottom:6px;">
                <option value="">Random</option>
                <option value="win">Player Win (Reach Top)</option>
                <option value="loss">Player Loss (Hit Mine)</option>
              </select>
              <label style="color:#888;font-size:10px;display:block;margin-bottom:4px;">Mine Row (0-8, optional):</label>
              <input type="number" id="rig-tower-row" placeholder="e.g. 2" min="0" max="8" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;padding:5px;border-radius:4px;font-size:10px;box-sizing:border-box;">
            </div>
            
            <button id="rig-apply" style="width:100%;background:#00ff87;color:#0f0f0f;border:none;border-radius:6px;padding:8px;font-weight:bold;cursor:pointer;font-size:12px;">Apply Settings</button>
            
            <button id="rig-clear" style="width:100%;background:#ff4444;color:white;border:none;border-radius:6px;padding:6px;margin-top:6px;font-weight:bold;cursor:pointer;font-size:11px;">Clear All</button>
            
            <div id="rig-status" style="margin-top:8px;color:#00ff87;font-size:10px;text-align:center;"></div>
          </div>
        `;
        document.body.appendChild(panel);
        
        // Add event listeners
        document.getElementById('rig-close').addEventListener('click', () => this.toggle());
        document.getElementById('rig-apply').addEventListener('click', () => this.apply());
        document.getElementById('rig-clear').addEventListener('click', () => this.clear());
      }
      panel.style.display = 'block';
      
      // Load current values
      this.loadValues();
    },
    
    // Load current values into inputs
    loadValues: function() {
      const minesInput = document.getElementById('rig-mines');
      const coinSelect = document.getElementById('rig-coin');
      const crashInput = document.getElementById('rig-crash');
      const diceInput = document.getElementById('rig-dice');
      const blackjackSelect = document.getElementById('rig-blackjack');
      const towerResultSelect = document.getElementById('rig-tower-result');
      const towerRowInput = document.getElementById('rig-tower-row');
      
      if (minesInput && this.minesPosition) minesInput.value = this.minesPosition.join(',');
      if (coinSelect && this.coinFlipResult) coinSelect.value = this.coinFlipResult;
      if (crashInput && this.crashMultiplier) crashInput.value = this.crashMultiplier;
      if (diceInput && this.diceRoll !== null) diceInput.value = this.diceRoll;
      if (blackjackSelect && this.blackjackResult) blackjackSelect.value = this.blackjackResult;
      if (towerResultSelect && this.towerResult) towerResultSelect.value = this.towerResult;
      if (towerRowInput && this.towerPositions) towerRowInput.value = Object.keys(this.towerPositions)[0] || '';
    },
    
    // Hide control panel
    hidePanel: function() {
      const panel = document.getElementById('admin-rig-panel');
      if (panel) panel.style.display = 'none';
    },
    
    // Apply settings
    apply: function() {
      const minesInput = document.getElementById('rig-mines')?.value;
      const coinSelect = document.getElementById('rig-coin')?.value;
      const crashInput = document.getElementById('rig-crash')?.value;
      const diceInput = document.getElementById('rig-dice')?.value;
      const blackjackSelect = document.getElementById('rig-blackjack')?.value;
      const towerResultSelect = document.getElementById('rig-tower-result')?.value;
      const towerRowInput = document.getElementById('rig-tower-row')?.value;
      
      if (minesInput) {
        this.minesPosition = minesInput.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 0 && n <= 24);
      } else {
        this.minesPosition = null;
      }
      
      this.coinFlipResult = coinSelect || null;
      this.crashMultiplier = crashInput ? parseFloat(crashInput) : null;
      this.diceRoll = diceInput ? parseFloat(diceInput) : null;
      this.blackjackResult = blackjackSelect || null;
      this.towerResult = towerResultSelect || null;
      
      if (towerRowInput) {
        const row = parseInt(towerRowInput);
        if (!isNaN(row) && row >= 0 && row <= 8) {
          // Set mine at random position in specified row
          this.towerPositions = { [row]: Math.floor(Math.random() * 4) };
        } else {
          this.towerPositions = null;
        }
      } else {
        this.towerPositions = null;
      }
      
      const status = document.getElementById('rig-status');
      if (status) {
        status.textContent = '✅ Settings applied!';
        setTimeout(() => status.textContent = '', 2000);
      }
      
      console.log('🔐 Admin rigging active:', {
        enabled: this.enabled,
        mines: this.minesPosition,
        coin: this.coinFlipResult,
        crash: this.crashMultiplier,
        dice: this.diceRoll,
        blackjack: this.blackjackResult,
        tower: { result: this.towerResult, positions: this.towerPositions }
      });
    },
    
    // Clear all settings
    clear: function() {
      this.minesPosition = null;
      this.coinFlipResult = null;
      this.crashMultiplier = null;
      this.diceRoll = null;
      this.blackjackResult = null;
      this.towerResult = null;
      this.towerPositions = null;
      
      const inputs = ['rig-mines', 'rig-coin', 'rig-crash', 'rig-dice', 'rig-blackjack', 'rig-tower-result', 'rig-tower-row'];
      inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      
      const status = document.getElementById('rig-status');
      if (status) {
        status.textContent = '🗑️ All cleared!';
        setTimeout(() => status.textContent = '', 2000);
      }
    }
  };

  // Keyboard shortcut: Cmd+L (Mac) or Ctrl+L (Windows)
  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
      e.preventDefault();
      e.stopPropagation();
      window.adminRigging.toggle();
    }
  });

  console.log('🔐 Admin Rigging System loaded. Press Cmd+L or Ctrl+L to access (Admin only).');
})();
