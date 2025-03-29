import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { v7 as uuidv7 } from 'uuid'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDrizzle } from '@/db/provider'
import { modelsTable } from '@/db/tables'
import { Model } from '@/types'

const formSchema = z
  .object({
    provider: z.enum(['openai', 'fireworks', 'openai_compatible']),
    model: z.string().min(1, { message: 'Model name is required.' }),
    url: z.string().optional(),
    api_key: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.provider === 'openai_compatible') {
        return data.url !== undefined && data.url.length > 0
      }
      return true
    },
    {
      message: 'URL is required for OpenAI Compatible providers',
      path: ['url'],
    }
  )
  .refine(
    (data) => {
      if (data.provider === 'openai_compatible') {
        return true // API key is optional for openai_compatible
      }
      return data.api_key !== undefined && data.api_key.length > 0
    },
    {
      message: 'API Key is required for this provider',
      path: ['api_key'],
    }
  )

export default function NewModelPage() {
  const navigate = useNavigate()
  const { db } = useDrizzle()
  const queryClient = useQueryClient()

  const createModelMutation = useMutation({
    mutationFn: async (model: Omit<Model, 'id'>) => {
      const id = uuidv7()
      await db.insert(modelsTable).values({
        id,
        ...model,
      })
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['models'] })
      navigate(`/settings/models/${id}`)
    },
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: 'openai',
      model: '',
      url: '',
      api_key: '',
    },
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createModelMutation.mutate({
      ...values,
      api_key: values.api_key || null,
      url: values.url || null,
      is_system: 0,
    })
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger variant="outline" className="w-full">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="fireworks">Fireworks</SelectItem>
                        <SelectItem value="openai_compatible">OpenAI Compatible</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('provider') === 'openai_compatible' && (
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="api_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={createModelMutation.isPending}>
              {createModelMutation.isPending ? 'Adding...' : 'Add Model'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
