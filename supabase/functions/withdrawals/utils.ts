import jwt, { JwtPayload } from 'npm:jsonwebtoken';
import { JwksClient } from 'npm:jwks-rsa';

interface AuthResult {
  success: boolean;
  payload?: JwtPayload;
  error?: string;
}

/**
 * Verify Dynamic JWT token
 * @param token - The JWT token to verify
 * @param dynamicEnvId - Your Dynamic environment ID
 * @param allowAdditionalAuth - Whether to allow tokens that require additional auth (default: false)
 * @returns Promise<AuthResult>
 */
export async function verifyDynamicJWT(
  token: string,
  dynamicEnvId: string,
  allowAdditionalAuth: boolean = false,
): Promise<AuthResult> {
  try {
    const jwksUrl =
      `https://app.dynamic.xyz/api/v0/sdk/${dynamicEnvId}/.well-known/jwks`;
    const client = new JwksClient({
      jwksUri: jwksUrl,
      rateLimit: true,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
    });

    // Get signing key and verify token
    const signingKey = await client.getSigningKey();
    const publicKey = signingKey.getPublicKey();

    const decodedToken = jwt.verify(token, publicKey, {
      ignoreExpiration: false,
    }) as JwtPayload;

    // Check for additional auth requirements
    if (
      decodedToken.scopes?.includes('requiresAdditionalAuth') &&
      !allowAdditionalAuth
    ) {
      return {
        success: false,
        error: 'Additional verification required',
      };
    }

    return {
      success: true,
      payload: decodedToken,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : 'Token verification failed',
    };
  }
}

/**
 * Extract Bearer token from Authorization header
 * @param authHeader - The Authorization header value
 * @returns The token string or null if invalid
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

export type { AuthResult };
