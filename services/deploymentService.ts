/**
 * Deployment Service
 * Handles CloudFlare/Terraform deployment configuration and webhook triggers
 */

import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { Project } from '../types';

export interface DeploymentConfig {
  theme?: string;
  webhookUrl?: string;
  customDomain?: string;
}

/**
 * Update deployment configuration for a project
 */
export async function updateDeploymentConfig(
  organizationId: string,
  projectId: string,
  config: DeploymentConfig
): Promise<void> {
  const projectRef = doc(db, 'organizations', organizationId, 'projects', projectId);

  await updateDoc(projectRef, {
    'settings.deployment.theme': config.theme || null,
    'settings.deployment.webhookUrl': config.webhookUrl || null,
    'settings.deployment.customDomain': config.customDomain || null,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Trigger a build via the CloudFlare webhook
 * Uses Cloud Function to avoid CORS issues
 */
export async function triggerBuild(
  organizationId: string,
  projectId: string,
  _userId: string,
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const triggerCloudFlareBuild = httpsCallable<
      { webhookUrl: string },
      { success: boolean; message: string }
    >(functions, 'triggerCloudFlareBuild');

    const result = await triggerCloudFlareBuild({ webhookUrl });

    return { success: result.data.success };
  } catch (error: any) {
    console.error('[DeploymentService] Error triggering build:', error);

    // Extract error message from Firebase function error
    const errorMessage = error.message || error.details || 'Unknown error';
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Validate webhook URL format
 * Note: Actual testing requires triggering a build via Cloud Function
 */
export async function testWebhook(
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  // Validate URL format only (can't test from browser due to CORS)
  if (!webhookUrl.includes('api.cloudflare.com') || !webhookUrl.includes('deploy_hooks')) {
    return {
      success: false,
      error: 'Invalid CloudFlare webhook URL format'
    };
  }

  // URL format is valid
  return {
    success: true,
    error: undefined
  };
}

/**
 * Get deployment configuration for a project
 */
export async function getDeploymentConfig(
  organizationId: string,
  projectId: string
): Promise<DeploymentConfig | null> {
  const projectRef = doc(db, 'organizations', organizationId, 'projects', projectId);
  const projectSnap = await getDoc(projectRef);

  if (!projectSnap.exists()) {
    return null;
  }

  const project = projectSnap.data() as Project;
  return project.settings?.deployment || null;
}
