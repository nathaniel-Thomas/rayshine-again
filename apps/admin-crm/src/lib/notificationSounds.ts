// Notification sounds and visual indicators for real-time alerts

export type NotificationSoundType = 'job_assignment' | 'booking_confirmed' | 'message_received' | 'system_alert' | 'error';

export interface NotificationConfig {
  sound: boolean;
  vibrate: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  persistent: boolean;
  autoClose?: number; // seconds
}

export class NotificationSoundService {
  private audioContext: AudioContext | null = null;
  private soundBuffers: Map<NotificationSoundType, AudioBuffer> = new Map();
  private isInitialized = false;
  private volume = 0.8;
  private soundEnabled = true;
  private vibrationEnabled = true;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Pre-generate notification sounds
      await this.generateNotificationSounds();
      
      this.isInitialized = true;
      console.log('🔊 Notification sound service initialized');
    } catch (error) {
      console.warn('⚠️ Could not initialize audio context:', error);
    }
  }

  private async generateNotificationSounds() {
    if (!this.audioContext) return;

    const sounds: Record<NotificationSoundType, { frequency: number; duration: number; pattern?: number[] }> = {
      job_assignment: { 
        frequency: 800, 
        duration: 0.5,
        pattern: [0.2, 0.1, 0.2] // Multiple beeps for urgent job assignments
      },
      booking_confirmed: { 
        frequency: 600, 
        duration: 0.3,
        pattern: [0.15, 0.05, 0.15] // Double beep for confirmations
      },
      message_received: { 
        frequency: 400, 
        duration: 0.2 
      },
      system_alert: { 
        frequency: 1000, 
        duration: 0.4,
        pattern: [0.1, 0.05, 0.1, 0.05, 0.1] // Multiple quick beeps for alerts
      },
      error: { 
        frequency: 200, 
        duration: 0.6 
      }
    };

    for (const [type, config] of Object.entries(sounds)) {
      try {
        const buffer = await this.generateToneBuffer(
          config.frequency, 
          config.duration, 
          config.pattern
        );
        this.soundBuffers.set(type as NotificationSoundType, buffer);
      } catch (error) {
        console.warn(`Failed to generate sound for ${type}:`, error);
      }
    }
  }

  private async generateToneBuffer(
    frequency: number, 
    duration: number, 
    pattern?: number[]
  ): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    const sampleRate = this.audioContext.sampleRate;
    const totalDuration = pattern ? pattern.reduce((a, b) => a + b, 0) : duration;
    const buffer = this.audioContext.createBuffer(1, sampleRate * totalDuration, sampleRate);
    const channelData = buffer.getChannelData(0);

    if (pattern) {
      // Generate pattern of beeps
      let currentTime = 0;
      for (let i = 0; i < pattern.length; i++) {
        const beepDuration = pattern[i];
        const startSample = Math.floor(currentTime * sampleRate);
        const endSample = Math.floor((currentTime + beepDuration) * sampleRate);
        
        // Only generate tone for odd indices (even indices are silence)
        if (i % 2 === 0) {
          for (let sample = startSample; sample < endSample; sample++) {
            const time = sample / sampleRate;
            const envelope = Math.sin((time - currentTime) / beepDuration * Math.PI); // Envelope to avoid clicks
            channelData[sample] = Math.sin(2 * Math.PI * frequency * time) * envelope * 0.3;
          }
        }
        
        currentTime += beepDuration;
      }
    } else {
      // Generate simple tone
      for (let sample = 0; sample < channelData.length; sample++) {
        const time = sample / sampleRate;
        const envelope = Math.sin(time / duration * Math.PI); // Envelope to avoid clicks
        channelData[sample] = Math.sin(2 * Math.PI * frequency * time) * envelope * 0.3;
      }
    }

    return buffer;
  }

  async playNotificationSound(
    type: NotificationSoundType, 
    config: Partial<NotificationConfig> = {}
  ): Promise<void> {
    if (!this.soundEnabled || !config.sound !== false) return;
    if (!this.isInitialized || !this.audioContext) return;

    const soundBuffer = this.soundBuffers.get(type);
    if (!soundBuffer) return;

    try {
      // Resume audio context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = soundBuffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Adjust volume based on priority
      const volumeMultiplier = config.priority === 'urgent' ? 1.2 : 
                              config.priority === 'high' ? 1.0 : 
                              config.priority === 'medium' ? 0.8 : 0.6;
      gainNode.gain.value = this.volume * volumeMultiplier;
      
      source.start();
      
      console.log(`🔊 Playing notification sound: ${type} (priority: ${config.priority || 'medium'})`);
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  triggerVibration(pattern: number[] = [200, 100, 200]): void {
    if (!this.vibrationEnabled || !navigator.vibrate) return;
    
    try {
      navigator.vibrate(pattern);
      console.log('📳 Vibration triggered');
    } catch (error) {
      console.warn('Vibration not supported:', error);
    }
  }

  async showNotification(
    title: string,
    message: string,
    config: NotificationConfig & { 
      icon?: string;
      tag?: string;
      data?: any;
      actions?: { action: string; title: string; icon?: string }[];
    } = { sound: true, vibrate: true, priority: 'medium', persistent: false }
  ): Promise<void> {
    // Request permission if needed
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission denied');
      return;
    }

    // Show visual notification
    const notification = new Notification(title, {
      body: message,
      icon: config.icon || '/favicon.ico',
      tag: config.tag,
      data: config.data,
      badge: '/favicon.ico',
      requireInteraction: config.persistent,
      silent: !config.sound, // Let our custom sound play instead
      ...(config.actions && { actions: config.actions })
    });

    // Play sound and vibration
    if (config.sound) {
      const soundType = this.getSoundTypeFromConfig(config);
      await this.playNotificationSound(soundType, config);
    }

    if (config.vibrate) {
      const vibrationPattern = this.getVibrationPattern(config.priority);
      this.triggerVibration(vibrationPattern);
    }

    // Auto-close if specified
    if (config.autoClose && config.autoClose > 0) {
      setTimeout(() => {
        notification.close();
      }, config.autoClose * 1000);
    }

    // Handle notification clicks
    notification.addEventListener('click', () => {
      window.focus();
      notification.close();
      
      // Emit custom event for app to handle
      window.dispatchEvent(new CustomEvent('notification-clicked', {
        detail: { tag: config.tag, data: config.data }
      }));
    });
  }

  private getSoundTypeFromConfig(config: NotificationConfig & { data?: any }): NotificationSoundType {
    if (config.data?.type) {
      switch (config.data.type) {
        case 'job_assignment': return 'job_assignment';
        case 'booking_confirmed': return 'booking_confirmed';
        case 'message': return 'message_received';
        case 'system': return 'system_alert';
        case 'error': return 'error';
        default: return 'system_alert';
      }
    }
    
    return config.priority === 'urgent' ? 'job_assignment' : 'system_alert';
  }

  private getVibrationPattern(priority: string): number[] {
    switch (priority) {
      case 'urgent':
        return [200, 100, 200, 100, 200]; // Long vibration pattern for urgent
      case 'high':
        return [200, 100, 200]; // Double vibration
      case 'medium':
        return [200]; // Single vibration
      case 'low':
        return [100]; // Short vibration
      default:
        return [200];
    }
  }

  // Settings management
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    localStorage.setItem('rayshine-sound-enabled', enabled.toString());
  }

  setVibrationEnabled(enabled: boolean): void {
    this.vibrationEnabled = enabled;
    localStorage.setItem('rayshine-vibration-enabled', enabled.toString());
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('rayshine-volume', volume.toString());
  }

  isSoundEnabled(): boolean {
    const stored = localStorage.getItem('rayshine-sound-enabled');
    return stored !== null ? stored === 'true' : this.soundEnabled;
  }

  isVibrationEnabled(): boolean {
    const stored = localStorage.getItem('rayshine-vibration-enabled');
    return stored !== null ? stored === 'true' : this.vibrationEnabled;
  }

  getVolume(): number {
    const stored = localStorage.getItem('rayshine-volume');
    return stored !== null ? parseFloat(stored) : this.volume;
  }

  // Test methods for settings UI
  async testJobAssignmentAlert(): Promise<void> {
    await this.showNotification(
      '🚨 Test Job Assignment',
      'This is what a job assignment notification looks like',
      {
        sound: true,
        vibrate: true,
        priority: 'urgent',
        persistent: false,
        autoClose: 5,
        data: { type: 'job_assignment' },
        tag: 'test-job-assignment'
      }
    );
  }

  async testBookingConfirmation(): Promise<void> {
    await this.showNotification(
      '✅ Test Booking Confirmed',
      'This is what a booking confirmation looks like',
      {
        sound: true,
        vibrate: true,
        priority: 'high',
        persistent: false,
        autoClose: 3,
        data: { type: 'booking_confirmed' },
        tag: 'test-booking-confirmed'
      }
    );
  }
}

// Singleton instance
export const notificationSoundService = new NotificationSoundService();