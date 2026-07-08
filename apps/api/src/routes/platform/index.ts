// ============================================================================
// Platform route'ları — /api/platform/* (tenant hook ATLAR; kendi auth'u var).
// ============================================================================
// signup (public) · onboarding (OWNER) · billing (OWNER + public plan listesi)
// · admin (süper-admin). buildServer bunu { prefix: '/api/platform' } ile kayıtlar.

import { FastifyInstance } from 'fastify';
import signupRoutes from './signup';
import passwordRoutes from './password';
import onboardingRoutes from './onboarding';
import billingRoutes from './billing';
import adminRoutes from './admin';

export default async function platformRoutes(server: FastifyInstance) {
  await server.register(signupRoutes);
  await server.register(passwordRoutes);
  await server.register(onboardingRoutes);
  await server.register(billingRoutes);
  await server.register(adminRoutes);
}
