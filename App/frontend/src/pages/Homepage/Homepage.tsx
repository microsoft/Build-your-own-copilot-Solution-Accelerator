import React from 'react'
import icon from '../../assets/RV-Copilot.svg'
import {
  Body1Strong
} from '@fluentui/react-components'

import styles from './Homepage.module.css'
import { FeatureCard, TextFieldCard } from '../../components/Homepage/Cards'
import { NewsRegular, BookRegular, NotepadRegular } from '@fluentui/react-icons'
import { SidebarOptions } from '../../components/SidebarView/SidebarView'

const Homepage: React.FC = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <header className={styles.header}>
          <img src={icon} alt="App Icon" className={styles.appIcon} />
          <h1>Grant <span className={styles.gradientText}>Writer</span></h1>
          <Body1Strong>AI-powered assistant for research acceleration</Body1Strong>
        </header>

        <TextFieldCard />

        <section className={styles.features}>
          <FeatureCard
            title="Explore scientific journals"
            description="Explore the PubMed article database for relevant scientific data"
            featureSelection={SidebarOptions.Article}
            icon={
              <NewsRegular
                style={{
                  minWidth: 48,
                  minHeight: 48
                }}
              />
            }
          />
          <FeatureCard
            title="Explore grant opportunities"
            description="Explore the PubMed grant database for available announcements"
            featureSelection={SidebarOptions.Grant}
            icon={
              <BookRegular
                style={{
                  minWidth: 48,
                  minHeight: 48
                }}
              />
            }
          />
          <FeatureCard
            title="Draft a grant proposal"
            description="Assist in writing a comprehesive grant proposal for your research project"
            featureSelection={SidebarOptions.DraftDocuments}
            icon={
              <NotepadRegular
                style={{
                  minWidth: 48,
                  minHeight: 48
                }}
              />
            }
          />
        </section>
      </main>
    </div>
  )
}

export default Homepage
