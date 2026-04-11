// Victory screen — shown after the player beats the boss (v0.4).

import styles from './VictoryScreen.module.css'

interface Props {
  onTryAgain: () => void
}

export function VictoryScreen({ onTryAgain }: Props) {
  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Boss Defeated</h1>
      <p className={styles.subtitle}>Your squad has conquered the run!</p>
      <button className={styles.button} onClick={onTryAgain}>
        Try Again
      </button>
    </div>
  )
}
