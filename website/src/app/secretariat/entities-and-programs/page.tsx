import { connection } from 'next/server'
import { explainerTexts } from '@/lib/en_text_contents'
import { EntitiesProgrammesTable } from '@/components/EntitiesProgrammesTable'
import { getEntitiesProgrammesData } from '@/lib/data/entities-programmes'

export const metadata = {
  title: explainerTexts.pageTitles.entities,
}

export default async function EntitiesAndProgramsPage() {
  await connection()
  const { budgetVersion, rows, expenditures, clusters } =
    await getEntitiesProgrammesData()
  return (
    <section className="mx-auto max-w-6xl px-2 pt-3 pb-10 sm:px-6 md:px-12 lg:px-16">
      <EntitiesProgrammesTable
        key={budgetVersion.slug}
        rows={rows}
        expenditures={expenditures}
        budgetVersion={budgetVersion.slug}
        clusters={clusters}
      />
    </section>
  )
}
