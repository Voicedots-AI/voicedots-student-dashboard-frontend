export function interviewOutcome(status?: string | null, reason?: string | null, source?: string | null) {
  if (status === 'candidate_ended') {
    return source === 'proctor' ? 'Interview stopped by monitoring' : 'Interview ended early by you';
  }
  if (reason === 'connection_lost') return 'Interview interrupted by a lost connection';
  if (['internal_error', 'voice_provider_limit', 'stale_runtime'].includes(reason || '')) {
    return 'Interview interrupted by a service issue';
  }
  if (reason === 'time_limit_reached') return 'Interview time finished';
  return '';
}
