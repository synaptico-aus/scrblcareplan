import type { CarePlanDocument } from "../../shared/care-plan-document";

export type ProviderTemplateConfiguration = Pick<CarePlanDocument["metadata"],
  "organisationName" | "careWording" | "supportPhone" | "supportEmail">;

/**
 * Deliberately empty until a provider approves their own wording/contact details.
 * Key entries by authenticated organisation ID, never by a client-supplied brand.
 * The Salveo reference's CARE declaration asserts collaboration/commitment, so
 * even that wording must be approved rather than treated as participant evidence.
 */
const providerConfigurations: Readonly<Record<string, ProviderTemplateConfiguration>> = {};

export function getCarePlanTemplateConfiguration(organisationId: string): Partial<ProviderTemplateConfiguration> {
  return providerConfigurations[organisationId] || {};
}
