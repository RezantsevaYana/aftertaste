export interface Person {
  id: string
  handle: string
  firstName: string | null
  lastName: string | null
  avatar: string | null
}
export interface SocialPerson extends Person {
  friend: boolean
  following: boolean
  request: 'incoming' | 'outgoing' | null
}
export const personName = (person: Person) => [person.firstName, person.lastName].filter(Boolean).join(' ') || person.handle
