import React, { useState, useContext } from 'react'
import {
  mergeClasses,
  Text,
  Textarea,
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle, Card as FluentCard, CardHeader, CardProps as FluentCardProps
} from '@fluentui/react-components'
import styles from './DraftDocumentsView.module.css'
import { type DocumentSection, documentSectionGenerate } from '../../api'
import { Stack } from '@fluentui/react'
import { AppStateContext } from '../../state/AppProvider'
import { documentSectionPrompt, RegenerateIcon, SystemErrMessage } from './Card'

export const ResearchTopicCard = (): JSX.Element => {
  const [is_bad_request, set_is_bad_request] = useState(false)
  const appStateContext = useContext(AppStateContext)
  const [open, setOpen] = useState(false)

  const callGenerateSectionContent = async (documentSection: DocumentSection) => {
    if (appStateContext?.state.researchTopic === undefined || appStateContext?.state.researchTopic === '') {
      console.error('No research topic')
      return ''
    }

    if (documentSection.metaPrompt !== '') {
      documentSection.metaPrompt = ''
    }

    const generatedSection = await documentSectionGenerate(appStateContext?.state.researchTopic, documentSection)
    if ((generatedSection?.body) != null && (generatedSection?.status) != 400) {
      set_is_bad_request(false)
      const response = await generatedSection.json()
      return response.content
    } else {
      setTimeout(() => {
        set_is_bad_request(true)
      }, 2000)
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
            data-testid="newtopic"
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
                documentSections[i].metaPrompt = documentSectionPrompt(documentSections[i].title, data.value)
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
            data-testid="dialog_content"
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
                  documentSections[i].content = newDocumentSections[i]
                  console.error('Error generating section content')
                  setOpen(false)
                } else {
                  documentSections[i].content = newDocumentSections[i]
                  documentSections[i].metaPrompt = documentSectionPrompt(documentSections[i].title, appStateContext?.state.researchTopic ?? '')
                }
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
                data-testid="btngenerate"
                icon={<RegenerateIcon />}>
                Generate
              </Button>
            </DialogTrigger>
            <DialogSurface className={styles.loadingDiv}>
              <DialogTitle className={styles.loadingText}>Working on it...</DialogTitle>
            </DialogSurface>
          </Dialog>
        </Stack>
        <div>
          {is_bad_request && (<p data-testid="SystemErrMessage" className={styles.error}>{SystemErrMessage}</p>)}
        </div>
      </FluentCard>
  )
}