// Game-over screen — shown when all player units are wiped (v0.4).

import styles from './GameOverScreen.module.css'

interface Props {
  onTryAgain: () => void
}

export function GameOverScreen({ onTryAgain }: Props) {
  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Run Failed</h1>
      <p className={styles.subtitle}>Your squad was eliminated.</p>
      <button className={styles.button} onClick={onTryAgain}>
        Try Again
      </button>
    </div>
  )
}
