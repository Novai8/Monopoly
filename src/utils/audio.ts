// Centralized Web Audio API Synthesizer - STRICTLY NO MUSIC (Sound effects only)

export type SoundEffect =
  | 'button-click'
  | 'ui-hover'
  | 'ui-click'
  | 'ui-error'
  | 'dice-roll'
  | 'dice-throw'
  | 'dice-bounce'
  | 'dice-settle'
  | 'dice-stop'
  | 'step'
  | 'pawn-step'
  | 'property-buy'
  | 'rent-paid'
  | 'card-good'
  | 'card-bad'
  | 'card-neutral'
  | 'card-chaos'
  | 'lap-event'
  | 'auction-start'
  | 'auction-bid'
  | 'auction-win'
  | 'trade-accepted'
  | 'detention-slam'
  | 'detention'
  | 'salary-collect'
  | 'victory-fanfare'
  | 'victory';

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public volume: number = 0.8;
  public uiVolume: number = 0.8;
  public gameplayVolume: number = 0.8;

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(100, volume)) / 100;
  }

  public setUiVolume(volume: number) {
    this.uiVolume = Math.max(0, Math.min(100, volume)) / 100;
  }

  public setGameplayVolume(volume: number) {
    this.gameplayVolume = Math.max(0, Math.min(100, volume)) / 100;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || this.volume <= 0) return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public play(name: SoundEffect) {
    try {
      switch (name) {
        case 'ui-hover':
          this.playHover();
          break;
        case 'button-click':
        case 'ui-click':
          this.playClick();
          break;
        case 'ui-error':
          this.playError();
          break;
        case 'dice-throw':
          this.playDiceThrow();
          break;
        case 'dice-bounce':
          this.playDiceBounce();
          break;
        case 'dice-roll':
          this.playDiceRoll();
          break;
        case 'dice-settle':
        case 'dice-stop':
          this.playDiceSettle();
          break;
        case 'step':
        case 'pawn-step':
          this.playStep();
          break;
        case 'property-buy':
        case 'salary-collect':
          this.playCash();
          break;
        case 'rent-paid':
          this.playPayRent();
          break;
        case 'card-good':
        case 'lap-event':
          this.playCardGood();
          break;
        case 'card-bad':
          this.playCardBad();
          break;
        case 'card-neutral':
          this.playCardNeutral();
          break;
        case 'card-chaos':
          this.playCardChaos();
          break;
        case 'auction-start':
          this.playCardNeutral();
          break;
        case 'auction-bid':
          this.playAuctionBid();
          break;
        case 'auction-win':
          this.playCash();
          break;
        case 'trade-accepted':
          this.playTradeAccepted();
          break;
        case 'detention-slam':
        case 'detention':
          this.playJail();
          break;
        case 'victory-fanfare':
        case 'victory':
          this.playFanfare();
          break;
      }
    } catch {
      // Missing audio will never crash game
    }
  }

  private playHover() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.015);
    gain.gain.setValueAtTime(0.02 * this.volume * this.uiVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.015);
  }

  private playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.03);
    gain.gain.setValueAtTime(0.08 * this.volume * this.uiVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  private playError() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.09 * this.volume * this.uiVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  private playDiceThrow() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.07 * this.volume * this.gameplayVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  }

  private playDiceBounce() {
    const ctx = this.getContext();
    if (!ctx) return;
    // Low woody thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220 + Math.random() * 40, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.14 * this.volume * this.gameplayVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.045);
  }

  private playDiceSettle() {
    const ctx = this.getContext();
    if (!ctx) return;
    // Crisp click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.025);
    gain.gain.setValueAtTime(0.1 * this.volume * this.gameplayVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.025);
  }

  private playDiceRoll() {
    const ctx = this.getContext();
    if (!ctx) return;
    for (let i = 0; i < 7; i++) {
      const time = ctx.currentTime + i * 0.045 + Math.random() * 0.015;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120 + Math.random() * 220, time);
      gain.gain.setValueAtTime(0.12 * this.volume, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.035);
    }
  }

  private playStep() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  private playCash() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const time = ctx.currentTime + idx * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.12 * this.volume, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.1);
    });
  }

  private playPayRent() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [440, 392, 349.23, 293.66];
    notes.forEach((freq, idx) => {
      const time = ctx.currentTime + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.08 * this.volume, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.09);
    });
  }

  private playCardGood() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [587.33, 739.99, 880];
    notes.forEach((freq, idx) => {
      const time = ctx.currentTime + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.12 * this.volume, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.12);
    });
  }

  private playCardBad() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [260, 230, 200];
    notes.forEach((freq, idx) => {
      const time = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.12 * this.volume, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.11);
    });
  }

  private playCardNeutral() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.09 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  private playCardChaos() {
    const ctx = this.getContext();
    if (!ctx) return;
    const freqs = [300, 600, 450, 750];
    freqs.forEach((freq, idx) => {
      const time = ctx.currentTime + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.1 * this.volume, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.09);
    });
  }

  private playAuctionBid() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  private playTradeAccepted() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [392, 523.25, 659.25];
    notes.forEach((freq, idx) => {
      const time = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.12 * this.volume, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.14);
    });
  }

  private playJail() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.25 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  private playFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [440, 440, 440, 554.37, 659.25, 880];
    const delays = [0, 0.12, 0.24, 0.36, 0.52, 0.75];
    const lens = [0.1, 0.1, 0.1, 0.14, 0.2, 0.6];
    notes.forEach((freq, idx) => {
      const time = ctx.currentTime + delays[idx];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.18 * this.volume, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + lens[idx]);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + lens[idx]);
    });
  }
}

export const audio = new SoundEngine();
// Alias for backward compatibility
export const sounds = {
  get enabled() {
    return audio.enabled;
  },
  set enabled(val: boolean) {
    audio.enabled = val;
  },
  playDiceRoll: () => audio.play('dice-roll'),
  playStep: () => audio.play('step'),
  playCash: () => audio.play('property-buy'),
  playPayRent: () => audio.play('rent-paid'),
  playJail: () => audio.play('detention-slam'),
  playFanfare: () => audio.play('victory'),
};
