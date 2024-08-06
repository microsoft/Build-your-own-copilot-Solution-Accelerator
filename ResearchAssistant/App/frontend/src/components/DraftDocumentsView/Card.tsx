import React, { useState, useContext } from 'react'
import {
  Popover,
  PopoverSurface,
  PopoverTrigger,
  mergeClasses,
  Text,
  Textarea,
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle, Card as FluentCard, CardHeader, CardProps as FluentCardProps
} from '@fluentui/react-components'
import type { PopoverProps } from '@fluentui/react-components'
import { type DocumentSection, documentSectionGenerate } from '../../api'
import { AppStateContext } from '../../state/AppProvider'
import styles from './DraftDocumentsView.module.css'
import { Stack } from '@fluentui/react'
import { createSvgIcon } from '@fluentui/react-icons-mdl2'
import { Dismiss24Regular } from '@fluentui/react-icons'

const RegenerateIcon = createSvgIcon({
  svg: ({ classes }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={classes.svg}>
      <path d="M5.92655 2H12.1388C13.1922 2 14.1198 2.69397 14.4172 3.7046L14.8863 5.29901C15.0471 5.84546 15.5261 6.232 16.0855 6.28068H16.3746C17.2622 6.28068 17.9474 6.53232 18.4018 7.04832C18.8444 7.55084 18.9908 8.21838 19.0005 8.88707C19.0196 10.208 18.5029 11.849 18.0911 13.1554C17.7328 14.2924 17.2726 15.4729 16.6547 16.3777C16.0394 17.2788 15.1994 18.0006 14.0725 18.0006H7.87435L7.86646 18.0005H7.86014C6.80667 18.0005 5.8791 17.3066 5.58173 16.296L5.1126 14.7015C4.95189 14.1553 4.47319 13.7689 3.91407 13.7199H3.62439C2.73678 13.7199 2.0516 13.4683 1.59717 12.9523C1.1546 12.4498 1.00823 11.7822 0.998561 11.1135C0.979463 9.7926 1.49616 8.15165 1.90789 6.84517C2.26618 5.70826 2.72645 4.52772 3.34429 3.62288C3.95957 2.72178 4.79959 2 5.92655 2ZM2.86165 7.14574C2.43416 8.50224 1.98218 9.97352 1.99846 11.0991C2.00647 11.6536 2.1288 12.0429 2.34763 12.2914C2.5546 12.5264 2.92352 12.7199 3.62439 12.7199H6.25164C6.86091 12.7199 7.39766 12.3195 7.57163 11.7352C8.04123 10.158 8.83745 7.4963 9.46589 5.45934L9.49888 5.35233C9.64803 4.86841 9.79235 4.40016 9.94777 3.98475C10.0802 3.63087 10.2284 3.29335 10.4091 3H5.92655C5.28262 3 4.70593 3.40208 4.17013 4.18678C3.63688 4.96774 3.21171 6.03493 2.86165 7.14574ZM5.73396 13.7199C5.88143 13.9288 5.9968 14.1639 6.07194 14.4193L6.54107 16.0137C6.71323 16.5988 7.25024 17.0005 7.86014 17.0005H7.88629C8.24525 16.9969 8.48906 16.8275 8.64018 16.6226C8.80731 16.3959 8.95986 16.0792 9.11465 15.6654C9.25926 15.2789 9.39518 14.8381 9.54731 14.3446L9.57757 14.2465C9.64258 14.0357 9.7094 13.8183 9.77748 13.596C9.54251 13.6733 9.29276 13.7147 9.03563 13.7147H6.41025C6.35775 13.7182 6.30485 13.7199 6.25164 13.7199H5.73396ZM8.19301 12.7147H9.03563C9.58867 12.7147 10.0827 12.3842 10.2981 11.8846C10.7354 10.4387 11.1687 8.98844 11.469 7.98005C11.5444 7.72668 11.6594 7.4933 11.806 7.28588H10.9633C10.4106 7.28588 9.9169 7.61592 9.70129 8.11487C9.26383 9.56118 8.83037 11.0119 8.53005 12.0206C8.45462 12.2739 8.33963 12.5073 8.19301 12.7147ZM10.2216 6.40449C10.4565 6.32723 10.7062 6.28588 10.9633 6.28588H13.5897C13.6419 6.28243 13.6945 6.28068 13.7474 6.28068H14.265C14.1175 6.07183 14.0021 5.83666 13.927 5.58128L13.4578 3.98687C13.2857 3.40177 12.7487 3 12.1388 3H12.1239C11.7588 3.00023 11.5115 3.17099 11.3588 3.37803C11.1917 3.60467 11.0392 3.92146 10.8844 4.33517C10.7398 4.72167 10.6038 5.16256 10.4517 5.65601L10.4214 5.75415C10.3564 5.96483 10.2896 6.18225 10.2216 6.40449ZM17.1374 12.8549C17.5649 11.4984 18.0168 10.0271 18.0006 8.90153C17.9925 8.34698 17.8702 7.95771 17.6514 7.70923C17.4444 7.47423 17.0755 7.28068 16.3746 7.28068H13.7474C13.1381 7.28068 12.6014 7.68108 12.4274 8.26541C11.9578 9.84263 11.1616 12.5043 10.5331 14.5413L10.5001 14.6483C10.351 15.1322 10.2067 15.6005 10.0512 16.0159C9.91884 16.3697 9.77065 16.7073 9.58995 17.0006H14.0725C14.7164 17.0006 15.2931 16.5985 15.8289 15.8138C16.3621 15.0329 16.7873 13.9657 17.1374 12.8549Z" />
    </svg>
  ),
  displayName: 'RegenerateIcon'
})
export function documentSectionPrompt(title: string, topic: string): any {
  return `Create ${title} section of research grant application for - ${topic}.`
}
export const ResearchTopicCard = (): JSX.Element => {
  const appStateContext = useContext(AppStateContext)
  const [open, setOpen] = React.useState(false)

  const callGenerateSectionContent = async (documentSection: DocumentSection) => {
    if (appStateContext?.state.researchTopic === undefined || appStateContext?.state.researchTopic === '') {
      console.error('No research topic')
      return ''
    }

    const generatedSection = await documentSectionGenerate(appStateContext?.state.researchTopic, documentSection)
    if ((generatedSection?.body) != null) {
      const response = await generatedSection.json()
      return response.content
    } else {
      console.error('Error generating section')
      return ''
    }
  }

  return (
    <FluentCard className={styles.card}
      style={{
        backgroundColor: '#FAF9F8',
        boxShadow: '0px 4px 8px 0px #00000047',
        border: '1px solid #EDEBE9'
      }}
    >
      <Stack>
        <CardHeader header={<Text weight="bold">Topic</Text>} />
        <Text>What subject matter does your proposal cover?</Text>
      </Stack>

      <div className={mergeClasses(styles.flex, styles.cardContent)}>
        <Textarea
          placeholder='Type a new topic...'
          className={styles.cardTextArea}
          size="medium"
          onChange={(event, data) => {
            const documentSections = appStateContext?.state.documentSections ?? []
            for (let i = 0; i < documentSections.length; i++) {
              if (documentSections[i] == null) {
                console.error('Error generating section content in ResearchTopicCard onChange.')
                return
              }
              documentSections[i].metaPrompt = documentSectionPrompt(documentSections[i].title, data.value);
            }

            appStateContext?.dispatch({ type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS', payload: documentSections })
            appStateContext?.dispatch({ type: 'UPDATE_RESEARCH_TOPIC', payload: data.value })
          }}
          value={appStateContext?.state.researchTopic}
        />
      </div>

      <Stack horizontal style={{
        width: '100%',
        justifyContent: 'flex-end'
      }}>
        <Dialog
          open={open}
          onOpenChange={async (event, data) => {
            setOpen(data.open)
            const documentSections = appStateContext?.state.documentSections ?? []
            const newDocumentSectionContent = []
            for (let i = 0; i < documentSections.length; i++) {
              const section = documentSections[i]
              newDocumentSectionContent.push(callGenerateSectionContent(section))
            }
            const newDocumentSections = await Promise.all(newDocumentSectionContent)
            for (let i = 0; i < newDocumentSections.length; i++) {
              if (newDocumentSections[i] === '') {
                console.error('Error generating section content')
                return
              }

              documentSections[i].content = newDocumentSections[i]
              documentSections[i].metaPrompt = documentSectionPrompt(documentSections[i].title, appStateContext?.state.researchTopic ?? '');
            }

            appStateContext?.dispatch({ type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS', payload: documentSections })
            setOpen(false)
          }}
        >
          <DialogTrigger disableButtonEnhancement>
            <Button
              size="medium"
              appearance="primary"
              disabled={appStateContext?.state.researchTopic === ''}

              icon={<RegenerateIcon />}>
              Generate
            </Button>
          </DialogTrigger>
          <DialogSurface className={styles.loadingDiv}>
            <DialogTitle className={styles.loadingText}>Working on it...</DialogTitle>
          </DialogSurface>
        </Dialog>
      </Stack>
    </FluentCard>
  )
}

// Section Card
interface CardProps {
  index: number
}

export const Card = (props: CardProps) => {
  const appStateContext = useContext(AppStateContext)
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)
  const index: number = props.index
  const sectionInformation: DocumentSection | undefined = appStateContext?.state.documentSections?.[index]
  const [loading, setLoading] = useState(false)

  const handleGenerateClick = async (newPrompt: string) => {
    try {
      const documentSections = appStateContext?.state.documentSections ?? []
      const section = documentSections[index]
      if (section) {
        setLoading(true)
        const generatedSection = await documentSectionGenerate(appStateContext?.state.researchTopic || '', { ...section, metaPrompt: newPrompt })

        if (generatedSection && generatedSection.body) {
          const response = await generatedSection.json()
          const newContent = response.content
          const updatedDocumentSections = [...documentSections]
          updatedDocumentSections[index].content = newContent
          appStateContext?.dispatch({ type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS', payload: updatedDocumentSections })
          setLoading(false)
        } else {
          console.error('Error generating new content.')
        }
      } else {
        console.error('Section information is undefined.')
      }
    } catch (error) {
      console.error('Error generating section:', error)
      setLoading(false)
    }
  }

  const handleContentChange = (newValue: string) => {
    const documentSections = appStateContext?.state.documentSections ?? []
    documentSections[index].content = newValue
    appStateContext?.dispatch({ type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS', payload: documentSections })
  }

  const handleOpenPopoverChange: PopoverProps['onOpenChange'] = (e, data) => {
    setIsPopoverOpen(data.open || false)
  }

  return (
    <FluentCard className={styles.card} {...props}>
      <div className={styles.cardHeader}>
        <CardHeader header={<Text weight="bold">{sectionInformation?.title}</Text>} />
        <Popover open={isPopoverOpen} onOpenChange={handleOpenPopoverChange} positioning="below-end" size="large">
          <PopoverTrigger disableButtonEnhancement>
            <Button
              disabled={sectionInformation?.content === ''}
              className={styles.Gen} icon={<RegenerateIcon />}>
              Regenerate
            </Button>
          </PopoverTrigger>
          <PopoverSurface
            style={{
              width: '50%',
              flexDirection: 'column',
              gap: '1rem',
              backgroundColor: '#EDEBE9'
            }}
          >
            <div
              style={{ marginBottom: '1rem' }}
              className={styles.cardTextDiv}
            >
              <Text weight="bold">
                Regenerate {sectionInformation?.title}
              </Text>

              <Button
                style={{ border: 'none' }}
                icon={<Dismiss24Regular />}
                onClick={() => { setIsPopoverOpen(false) }}
              />
            </div>

          <Textarea
              style={{ marginBottom: '1rem'}}
              className={styles.regenerateCardTextarea}
              size="large"
              value={appStateContext?.state.documentSections?.[index]?.metaPrompt ?? ''}
              onChange={(event, data) => {
                const updatedMetaPrompt = data.value
                const documentSections = appStateContext?.state.documentSections ?? []
                documentSections[index].metaPrompt = updatedMetaPrompt
                appStateContext?.dispatch({ type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS', payload: documentSections })
              }}
             
            />

            <Stack horizontal style={{ justifyContent: 'space-between' }}>
              <div></div>
              <Button
                appearance="primary"
                icon={<RegenerateIcon />}
                onClick={() => {
                  setIsPopoverOpen(false)
                  handleGenerateClick(appStateContext?.state.documentSections?.[index]?.metaPrompt || '')
                }}
              >
                Generate
              </Button>
            </Stack>
          </PopoverSurface>
        </Popover>
          <div className={styles.sectionDisclaimer}>AI-generated content may be incorrect</div>
      </div>

      <div className={mergeClasses(styles.flex, styles.cardContent)}>
        <div className={styles.cardParagraph}>
          <p
            contentEditable={true}
            className={styles.editableParagraph}
            onBlur={(event) => {
              const newValue = (event.target as HTMLParagraphElement).textContent || ''
              handleContentChange(newValue)
            }}>
            {sectionInformation?.content}
          </p>
        </div>
      </div>

      {loading && (
        <DialogSurface className={styles.loadingDiv}>
          <DialogTitle className={styles.loadingText}>Working on it...</DialogTitle>
        </DialogSurface>
      )}
    </FluentCard>
  )
}
