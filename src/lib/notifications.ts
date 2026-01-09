import { supabase } from './supabase';

interface SendNotificationParams {
  type: 'announcement' | 'assignment' | 'leave_request' | 'leave_response';
  userIds: string[];
  title: string;
  body: string;
  entityType: string;
  entityId: string;
}

export async function sendImmediateNotification(params: SendNotificationParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('No active session');
      return { success: false, error: 'No active session' };
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-immediate-notification`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: params.type,
        user_ids: params.userIds,
        title: params.title,
        body: params.body,
        entity_type: params.entityType,
        entity_id: params.entityId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send notification:', error);
      return { success: false, error };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function notifyNewAnnouncement(announcementId: string, title: string, organizationId: string) {
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', organizationId);

  if (error || !users) {
    console.error('Error fetching users for announcement notification:', error);
    return;
  }

  const userIds = users.map(u => u.id);

  await sendImmediateNotification({
    type: 'announcement',
    userIds,
    title: 'Nuovo Annuncio',
    body: title,
    entityType: 'announcement',
    entityId: announcementId,
  });
}

export async function notifyNewAssignment(workerId: string, worksiteName: string, assignmentId: string) {
  await sendImmediateNotification({
    type: 'assignment',
    userIds: [workerId],
    title: 'Nuova Assegnazione',
    body: `Sei stato assegnato al cantiere: ${worksiteName}`,
    entityType: 'assignment',
    entityId: assignmentId,
  });
}

export async function notifyLeaveRequest(adminIds: string[], workerName: string, leaveRequestId: string) {
  await sendImmediateNotification({
    type: 'leave_request',
    userIds: adminIds,
    title: 'Nuova Richiesta Permesso',
    body: `${workerName} ha richiesto un permesso`,
    entityType: 'leave_request',
    entityId: leaveRequestId,
  });
}

export async function notifyLeaveResponse(workerId: string, status: 'approved' | 'rejected', leaveRequestId: string) {
  const statusText = status === 'approved' ? 'approvata' : 'rifiutata';

  await sendImmediateNotification({
    type: 'leave_response',
    userIds: [workerId],
    title: `Richiesta Permesso ${statusText === 'approvata' ? 'Approvata' : 'Rifiutata'}`,
    body: `La tua richiesta di permesso è stata ${statusText}`,
    entityType: 'leave_request',
    entityId: leaveRequestId,
  });
}
