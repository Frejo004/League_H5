export {}

declare global {
  interface MeteredParticipant {
    id: string
    name: string
    video: boolean
    audio: boolean
  }

  interface MeetingJoinOptions {
    roomURL: string
    name?: string
    accessToken?: string
  }

  class MeteredMeeting {
    constructor()
    join(options: MeetingJoinOptions): Promise<unknown>
    leaveMeeting(): Promise<void>
    startVideo(): Promise<void>
    stopVideo(): Promise<void>
    unmuteLocalAudio(): Promise<void>
    muteLocalAudio(): Promise<void>
    on(event: string, callback: (...args: unknown[]) => void): void
    off(event: string, callback: (...args: unknown[]) => void): void
    getParticipants(): Promise<MeteredParticipant[]>
    chooseAudioInputDevice(deviceId: string): Promise<void>
    chooseVideoInputDevice(deviceId: string): Promise<void>
  }

  const Metered: {
    Meeting: typeof MeteredMeeting
  }

  interface Window {
    Metered?: typeof Metered
  }
}
