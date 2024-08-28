import { PromptButton } from '../PromptButton/PromptButton'
import styles from './PromptsSection.module.css'

type PromptsSectionProps = {
  onClickPrompt: (promptObj: PromptType) => void
  isLoading: boolean
}
export type PromptType = {
  name: string
  question?: string
  key: string
}

const promptsConfg = [
  { name: 'Top discussion trends', question: 'Top discussion trends', key: 'p1' },
  { name: 'Investment summary', question: 'Investment summary', key: 'p2' },
  { name: 'Previous meeting summary', question: 'Previous meeting summary', key: 'p3' }
]

export const PromptsSection: React.FC<PromptsSectionProps> = ({ onClickPrompt, isLoading }) => {
  return (
    <div className={styles.promptsSection}>
      {promptsConfg.map(promptObj => (
        <PromptButton key={promptObj.key} disabled={isLoading} name={promptObj.name} onClick={() => onClickPrompt(promptObj)} />
      ))}
    </div>
  )
}
