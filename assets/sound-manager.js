class SoundManager {
    constructor() {
        this.sounds = {};
        this.music = {};
        this.isMuted = false;
        this.musicVolume = 0.3; // Уменьшил громкость
        this.sfxVolume = 0.5;
        this.currentMusic = null;
        this.initialized = false;
    }

    loadSound(key, path, type = 'sfx') {
        try {
            // Проверяем, существует ли файл (создаем без ошибок)
            const audio = new Audio();

            if (type === 'music') {
                audio.loop = true;
                audio.volume = this.musicVolume;
                audio.src = path;
                this.music[key] = audio;
            } else {
                audio.src = path;
                audio.volume = this.sfxVolume;
                this.sounds[key] = audio;

                // Пул звуков для быстрого воспроизведения
                this.sounds[key + '_pool'] = [];
                for (let i = 0; i < 3; i++) {
                    const clone = new Audio();
                    clone.src = path;
                    clone.volume = this.sfxVolume;
                    this.sounds[key + '_pool'].push(clone);
                }
            }
        } catch(e) {
            console.log(`Could not load sound: ${key}`);
        }
    }

    play(key, volume = 1.0) {
        if (this.isMuted || !this.sounds[key + '_pool']) return;

        try {
            const pool = this.sounds[key + '_pool'];
            for (let audio of pool) {
                if (audio.paused || audio.ended) {
                    audio.volume = volume * this.sfxVolume;
                    audio.currentTime = 0;
                    const playPromise = audio.play();
                    if (playPromise) {
                        playPromise.catch(() => {});
                    }
                    return;
                }
            }
            // Все заняты - используем первый
            pool[0].volume = volume * this.sfxVolume;
            pool[0].currentTime = 0;
            const playPromise = pool[0].play();
            if (playPromise) {
                playPromise.catch(() => {});
            }
        } catch(e) {
            // Игнорируем ошибки
        }
    }

    playMusic(key) {
        if (this.isMuted) return;

        try {
            // Останавливаем текущую музыку
            if (this.currentMusic && this.music[this.currentMusic]) {
                const oldMusic = this.music[this.currentMusic];
                oldMusic.pause();
                oldMusic.currentTime = 0;
            }

            if (this.music[key]) {
                const music = this.music[key];
                music.volume = this.musicVolume;
                this.currentMusic = key;
                const playPromise = music.play();
                if (playPromise) {
                    playPromise.catch(() => {});
                }
            }
        } catch(e) {
            // Игнорируем ошибки
        }
    }

    stopMusic() {
        try {
            if (this.currentMusic && this.music[this.currentMusic]) {
                this.music[this.currentMusic].pause();
                this.music[this.currentMusic].currentTime = 0;
            }
        } catch(e) {}
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopMusic();
        } else if (this.currentMusic && this.music[this.currentMusic]) {
            const playPromise = this.music[this.currentMusic].play();
            if (playPromise) {
                playPromise.catch(() => {});
            }
        }
        return this.isMuted;
    }

    preloadAll(soundList) {
        for (let [key, path, type] of soundList) {
            this.loadSound(key, path, type);
        }
        this.initialized = true;
        console.log('Sound system initialized');
    }
}

// Создаем глобальный экземпляр
const soundManager = new SoundManager();