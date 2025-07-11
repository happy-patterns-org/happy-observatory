'use client'

import { useServiceRegistry } from '@/hooks/use-service-registry'
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ServiceStatus() {
  const { services, loading, error, refresh, onlineServices, offlineServices } = useServiceRegistry()
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600'
      case 'offline':
        return 'text-red-600'
      default:
        return 'text-yellow-600'
    }
  }
  
  if (loading && services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Backend Services</CardTitle>
          <CardDescription>Discovering available services...</CardDescription>
        </CardHeader>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Backend Services</CardTitle>
            <CardDescription>
              {onlineServices.length} of {services.length} services online
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {services.map(service => (
            <div
              key={service.name}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(service.status)}
                <div>
                  <div className="font-medium capitalize">
                    {service.name.replace(/-/g, ' ')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {service.url}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getStatusColor(service.status)}`}>
                  {service.status.toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last checked: {new Date(service.lastCheck).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {services.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              No services configured
            </div>
          )}
          
          {error && (
            <div className="text-center py-8 text-red-600">
              Error loading services: {error.message}
            </div>
          )}
        </div>
        
        {offlineServices.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Some services are offline. The dashboard will use mock data 
              for these services until they become available.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}