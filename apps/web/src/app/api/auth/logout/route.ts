import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/security/auth-middleware'
import { tokenRevocationStore } from '@/lib/security/token-revocation'
import { logSecurityEvent, getRequestMetadata } from '@/lib/security/audit-logger'

async function logoutHandler(
  request: NextRequest,
  authContext: AuthContext
): Promise<NextResponse> {
  try {
    // Revoke the current token if it has a JTI
    if (authContext.user.jti) {
      tokenRevocationStore.revoke(authContext.user.jti, authContext.user.exp)
    }

    // Log security event
    logSecurityEvent('auth.logout', {
      userId: authContext.user.userId,
      ...getRequestMetadata(request),
    })

    // Clear the auth cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    response.cookies.delete('auth-token')

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 })
  }
}

// Export with authentication required
export const POST = withAuth(logoutHandler)
