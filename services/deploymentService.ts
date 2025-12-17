/**
 * Deployment Service
 * Handles CloudFlare/Terraform deployment configuration and webhook triggers
 */

import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
  projectId: string,
  config: DeploymentConfig
): Promise<void> {
  const projectRef = doc(db, 'projects', projectId);

  await updateDoc(projectRef, {
    'settings.deployment.theme': config.theme || null,
    'settings.deployment.webhookUrl': config.webhookUrl || null,
    'settings.deployment.customDomain': config.customDomain || null,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Trigger a build via the CloudFlare webhook
 * Returns true if successful, false otherwise
 */
export async function triggerBuild(
  projectId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Get the project to find the webhook URL
  const projectRef = doc(db, 'projects', projectId);
  const projectSnap = await getDoc(projectRef);

  if (!projectSnap.exists()) {
    return { success: false, error: 'Project not found' };
  }

  const project = projectSnap.data() as Project;
  const webhookUrl = project.settings?.deployment?.webhookUrl;

  if (!webhookUrl) {
    return { success: false, error: 'No webhook URL configured' };
  }

  try {
    // Trigger the CloudFlare deploy hook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: '',
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Webhook returned ${response.status}: ${response.statusText}`
      };
    }

    // Update last build timestamp
    await updateDoc(projectRef, {
      'settings.deployment.lastBuildTriggeredAt': Timestamp.now(),
      'settings.deployment.lastBuildTriggeredBy': userId,
    });

    return { success: true };
  } catch (error) {
    console.error('[DeploymentService] Error triggering build:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test if a webhook URL is valid and reachable
 * Note: This actually triggers a build, so use sparingly
 */
export async function testWebhook(
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  // Validate URL format
  if (!webhookUrl.includes('api.cloudflare.com') || !webhookUrl.includes('deploy_hooks')) {
    return {
      success: false,
      error: 'Invalid CloudFlare webhook URL format'
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: '',
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Webhook returned ${response.status}: ${response.statusText}`
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[DeploymentService] Error testing webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Get deployment configuration for a project
 */
export async function getDeploymentConfig(
  projectId: string
): Promise<DeploymentConfig | null> {
  const projectRef = doc(db, 'projects', projectId);
  const projectSnap = await getDoc(projectRef);

  if (!projectSnap.exists()) {
    return null;
  }

  const project = projectSnap.data() as Project;
  return project.settings?.deployment || null;
}
