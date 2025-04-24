import { DefaultButton, IButtonProps } from '@fluentui/react'
import styles from './PromptButton.module.css'

interface PromptButtonProps extends IButtonProps {
  onClick: () => void
  name: string
  disabled: boolean
}

export const PromptButton: React.FC<PromptButtonProps> = ({ onClick, name = '', disabled }) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <DefaultButton
      className={styles.promptBtn}
      disabled={disabled}
      text={name || 'Default Name'} // Branch: handling empty name
      onClick={handleClick} // Branch: conditionally handle click
    />
  );
};
