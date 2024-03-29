import * as React from 'react'
import { TextField, Text, Stack } from '@fluentui/react'
import styles from './DraftDocumentsView.module.css'
import { useContext, useState, useEffect, useRef } from 'react'
import { Card, ResearchTopicCard } from './Card'
import { AppStateContext } from '../../state/AppProvider'
import { saveAs } from 'file-saver'
import { Document, HeadingLevel, IParagraphOptions, Packer, Paragraph } from 'docx'
import { TextRun } from 'docx'; // Import the necessary package
import jsPDF from 'jspdf'
import { Button, Dialog, DialogBody, DialogSurface, DialogTitle, makeStyles } from '@fluentui/react-components'
import { Dismiss24Regular } from '@fluentui/react-icons'
import docxIcon from '../../assets/docx.png'
import pdfIcon from '../../assets/pdf.png'
import { getUserInfo } from '../../api'
import exportIcon from '../../assets/Icon.svg'

const useStyles = makeStyles({
  draftDocumentTitle: {
    marginBottom: '1rem',
    color: '#797775',
    fontSize: '18px'
  }
})

export const DraftDocumentsView = (): JSX.Element => {
  const [company, setCompany] = useState('Contoso')
  const [name, setName] = useState('')
  const [foaId, setFoaId] = useState('')
  const [foaTitle, setFoaTitle] = useState('')
  const [signedName, setSignedName] = useState('')
  const [signature, setSignature] = useState('')
  const appStateContext = useContext(AppStateContext)
  const [exportPopupOpen, setExportPopupOpen] = React.useState(false)
  const classes = useStyles()
  const exportButtonRef = React.useRef<HTMLButtonElement>(null)

  useEffect(() => {
    getUserInfo()
      .then((res) => {
        const fetchedName: string = res[0].user_claims.find((claim: any) => claim.typ === 'name')?.val ?? ''
        setName(fetchedName)
      })
      .catch((err) => {
        console.error('error fetching user info: ', err)
      })
  }, [])

  const handleExportClick = (): void => {
    setExportPopupOpen(true) // Open export popup
  }

  const handleCreateWordDoc = (): void => {
    // Create a new Document
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    new Paragraph({ text: 'Draft Document'}),
                    new Paragraph({ text: '' }), // New line after draft document name
                    new Paragraph(`Company: ${company}`),
                    new Paragraph({ text: '' }), // New line after company name
                    new Paragraph(`Name: ${name}`),
                    new Paragraph({ text: '' }), // New line after name
                    new Paragraph(`FOA ID: ${foaId}`),
                    new Paragraph({ text: '' }), // New line after FOA ID
                    new Paragraph(`FOA Title: ${foaTitle}`),
                    new Paragraph({ text: '' }), // New line after FOA Title
                    new Paragraph(`Research Topic: ${appStateContext?.state.researchTopic ?? ''}`),
                    new Paragraph({ text: '' }), // New line after Research Topic
                    ...(appStateContext?.state.documentSections ?? []).flatMap((section: any) => {
                        const paragraphs = [];
                        // Add section title
                        paragraphs.push(new Paragraph({ text: `Title: ${section.title}`}));
                        // Split content into lines and add as paragraphs
                        const contentLines = section.content.split(/\r?\n/); // Split content by newline
                        contentLines.forEach((line: string | IParagraphOptions) => {
                            paragraphs.push(new Paragraph(line));
                        });
                        paragraphs.push(new Paragraph({ text: '' })); // New line after each section content
                        return paragraphs;
                    }),
                    new Paragraph(`Signature: ${signature}`),
                    new Paragraph({ text: '' }), // New line after Additional Signature
                    new Paragraph(`Additional Signature: ${signedName}`),
                ]
            }
        ]
    })

    // Used to export the file into a .docx file
    Packer.toBlob(doc).then((blob) => {
        // Save DOCX file
        saveAs(blob, 'draft_document.docx')
    })
}

const handleCreatePDF = (): void => {
  // Create a new jsPDF instance
  const doc = new jsPDF();

  // Set font styles
  doc.setFont('helvetica');
  doc.setFontSize(12);

  // Set document title
  doc.text('Draft Document', 10, 10);
  doc.setLineWidth(0.5);
  doc.line(10, 12, 70, 12); // underline title

  // Add metadata
  doc.text(`Company: ${company}`, 10, 20);
  doc.text(`Name: ${name}`, 10, 30);
  doc.text(`FOA ID: ${foaId}`, 10, 40);
  doc.text(`FOA Title: ${foaTitle}`, 10, 50);
  doc.text(`Research Topic: ${appStateContext?.state.researchTopic ?? ''}`, 10, 60);

  // Add document sections
  let yPos = 70;
  (appStateContext?.state.documentSections ?? []).forEach((section: any) => {
      // Add section title
      const titleLines = doc.splitTextToSize(`Title: ${section.title}`, 180);
      if (yPos + titleLines.length * 5 > doc.internal.pageSize.height) {
          doc.addPage();
          yPos = 10; // Reset yPos for the new page
      }
      doc.text(titleLines, 10, yPos);

      // Add section content
      const contentLines = doc.splitTextToSize(`${section.content}`, 180);
      contentLines.forEach((line: string | string[]) => {
          if (yPos + 10 > doc.internal.pageSize.height) {
              doc.addPage();
              yPos = 10; // Reset yPos for the new page
          }
          doc.text(line, 10, yPos + 10); // increase y position for content
          yPos += 5; // Increment yPos based on line height
      });

      yPos += 20; // Add extra spacing between sections
  });

  // Add signature
  if (yPos + 20 > doc.internal.pageSize.height) {
      doc.addPage();
      yPos = 10; // Reset yPos for the new page
  }
  doc.text(`Signature: ${signature}`, 10, yPos);
  doc.text(`Additional Signature: ${signedName}`, 10, yPos + 10);

  // Save PDF file
  doc.save('draft_document.pdf');
};


  return (
    <div className={styles.container}>
      <Stack className={styles.draftDocumentHeader}>
        <Text variant="xLarge" className={styles.draftDocumentTitle}>Draft grant proposal</Text>
        <ResearchTopicCard />
      </Stack>

      <Stack className={styles.draftDocumentMainContainer}>
        <Stack horizontal style={{ justifyContent: 'flex-end' }}>
          <Button
            ref={exportButtonRef}
            size="medium" onClick={handleExportClick} appearance="outline"
            style={{ color: '#0078D4' }}
          icon={<img src={exportIcon} alt="Export Icon" className={styles.icon}/>}>
            Export
          </Button>
        </Stack>

        <div className={styles.textfieldDiv}>
          <TextField defaultValue="Contoso" className= "inputText" onChange={(event, data) => { setCompany(data ?? 'Contoso') }} value={company} />
          <TextField placeholder="Name" defaultValue={name} className= "inputText" onChange={(event, data) => { setName(data ?? '') }} value={name}/>
          <TextField placeholder="FOA ID" className= "inputText" onChange={(event, data) => { setFoaId(data ?? '') }} value={foaId}/>
          <TextField placeholder="FOA Title" className= "inputText" onChange={(event, data) => { setFoaTitle(data ?? '') }} value={foaTitle}/>
        </div>

        <div>
          <h4>Title</h4>
          <div className={styles.titleTextfield}>
            <TextField
              placeholder="Topic"
              onChange={(event, data) => {
                appStateContext?.dispatch({ type: 'UPDATE_RESEARCH_TOPIC', payload: data! })
              }}
              value={appStateContext?.state.researchTopic}
              className={styles.fullWidthTextField}
            />
          </div>
        </div>

        <div className={styles.contentContainer}>
          {(appStateContext?.state.documentSections ?? []).map((_, index) => (
            <div key={index}>
              <Card index={index}/>
            </div>
          ))}
        </div>

        <div className={styles.signatureTextfield}>
          <TextField placeholder="Signature" onChange={(event, data) => { setSignature(data ?? '') }} value={signature}/>
          <TextField placeholder="Additional Signature" onChange={(event, data) => { setSignedName(data ?? '') }} value={signedName}/>
        </div>
      </Stack>

      {exportPopupOpen && (
        <Dialog open={exportPopupOpen}>
          <DialogSurface className={styles.dialogSurface}>
            <DialogBody className={styles.DialogueBody}>
              <div className={styles.exportPopup}>
                <div className={styles.exportHeader}>
                  <DialogTitle className={styles.dialogueTitle}>Export</DialogTitle>
                  <Button
                    icon={<Dismiss24Regular />}
                    onClick={() => {
                      // focus on export button
                      setExportPopupOpen(false)
                      if (exportButtonRef.current !== null) {
                        exportButtonRef.current?.focus()
                      }
                    }}
                    className={styles.dialogueButton}
                  />
                </div>
                <div className={styles.exportOptions }>
                  <Button className={styles.exportButtonDoc} onClick={handleCreateWordDoc}>
                    <img src={docxIcon} alt="Word Doc Icon" />
                    <span>Create Word Doc</span>
                  </Button>
                  <Button className={styles.exportButtonPdf} onClick={handleCreatePDF}>
                    <img src={pdfIcon} alt="PDF Icon" />
                    <span>Create PDF</span>
                  </Button>
                </div>
              </div>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      )}
    </div>
  )
}
