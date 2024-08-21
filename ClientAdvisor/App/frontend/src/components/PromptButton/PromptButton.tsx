import { DefaultButton, IButtonProps } from '@fluentui/react'
import styles from './PromptButton.module.css'

interface PromptButtonProps extends IButtonProps {
  onClick: () => void
  name: string
}

export const PromptButton: React.FC<PromptButtonProps> = ({ onClick, name = '' }) => {
  return <DefaultButton className={styles.promptBtn} text={name} onClick={onClick} />
}
