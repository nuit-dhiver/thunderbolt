import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDrizzle } from '@/db/provider'

import { search } from '@/lib/embeddings'
import { useState } from 'react'

export default function SearchSection() {
  const { db } = useDrizzle()
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [searchText, setSearchText] = useState<string>('')
  const [limit, setLimit] = useState<number>(5)
  const [results, setResults] = useState<any[]>([])
  const [status, setStatus] = useState<string>('')

  const handleSearch = async () => {
    if (!searchText.trim()) {
      setStatus('Please enter search text')
      return
    }

    setIsSearching(true)
    setStatus('Searching...')
    try {
      const searchResults = await search(db, searchText, limit)
      console.log(searchResults)
      setResults(searchResults)
      setStatus(`Found ${searchResults.length} results`)
    } catch (error) {
      console.error('Error searching:', error)
      setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Semantic Search</CardTitle>
        <CardDescription>Search for email messages using semantic similarity</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="flex-1 p-2 border rounded" placeholder="Enter search text" disabled={isSearching} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Limit:</span>
            <input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="w-16 p-1 text-sm border rounded" min="1" max="100" disabled={isSearching} />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {status && (
          <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
            <div className="text-sm">{status}</div>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Results</h3>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-4 overflow-auto max-h-96">
              <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(results, null, 2)}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
