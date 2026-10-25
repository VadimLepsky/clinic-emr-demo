// Fictional patient names. Any match with a real person is a coincidence.
import type { Patient } from '../types'
import { addDays, type Rng } from './random'

const FEMALE = [
  'Rachel', 'Olivia', 'Amelia', 'Charlotte', 'Hannah', 'Megan', 'Fiona', 'Aisha', 'Zara', 'Niamh', 'Siobhan',
  'Katarzyna', 'Elena', 'Marta', 'Yasmin', 'Ruth', 'Margaret', 'Patricia', 'Janet', 'Susan', 'Deborah', 'Joanne',
  'Claire', 'Nicola', 'Amira', 'Mei', 'Ingrid', 'Bethany', 'Lucy', 'Abigail', 'Harriet', 'Eleanor',
]
const MALE = [
  'George', 'Harry', 'Jack', 'William', 'Henry', 'Samuel', 'Joseph', 'Ryan', 'Adam', 'Lewis', 'Callum', 'Connor',
  'Liam', 'Mohammed', 'Arjun', 'Tomasz', 'Piotr', 'Andrei', 'Mateo', 'Kwame', 'Robert', 'David', 'Peter', 'Michael',
  'Stephen', 'Paul', 'Graham', 'Ian', 'Keith', 'Colin', 'Gareth', 'Rory',
]
const GIRLS = ['Isla', 'Freya', 'Ava', 'Ruby', 'Poppy', 'Evie']
const BOYS = ['Leo', 'Noah', 'Theo', 'Alfie', 'Arthur', 'Finn']
const SURNAMES = [
  'Thompson', 'Walker', 'Robinson', 'Wright', 'Wood', 'Hall', 'Green', 'Clarke', 'Hill', 'Turner', 'Cooper', 'Ward',
  'Morris', 'King', 'Watson', 'Harrison', 'Morgan', 'Baker', 'Patel', 'Khan', 'Ahmed', 'Kowalski', 'Nowak', "O'Brien",
  'Kelly', 'MacDonald', 'Campbell', 'Stewart', 'Fraser', 'Evans', 'Price', 'Jenkins', 'Lloyd', 'Phillips', 'Chapman',
  'Palmer', 'Mitchell', 'Shaw', 'Fletcher', 'Barker', 'Doyle', 'Gallagher', 'Byrne', 'Nguyen', 'Okonkwo', 'Mensah',
  'Rossi', 'Silva', 'Dunn', 'Sutherland', 'Pearson', 'Holt', 'Kaur', 'Lindqvist', 'Moreau',
]

// A few names long enough to test wrapping in tables and on the A4 sheet.
const LONG_NAMES: [string, 'male' | 'female'][] = [
  ['Alexandra Montgomery-Fairweather', 'female'],
  ['Christopher Abernethy-Lockhart', 'male'],
  ['Maria Fernanda Oliveira dos Santos', 'female'],
]

/** [age, sex] for each patient: children, working age and older people, both sexes; ages 2–84. */
function agePlan(rng: Rng): [number, 'male' | 'female'][] {
  const bands: [number, number, number][] = [
    // [min age, max age, how many]
    [2, 6, 3], [7, 17, 3], [18, 34, 10], [35, 54, 18], [55, 69, 16], [70, 84, 10],
  ]
  const plan: [number, 'male' | 'female'][] = []
  for (const [min, max, count] of bands) {
    for (let i = 0; i < count; i++) plan.push([rng.int(min, max), rng.chance(0.55) ? 'female' : 'male'])
  }
  // The bounds are always there.
  plan[0][0] = 2
  plan[plan.length - 1][0] = 84
  return plan
}

export function buildPatients(rng: Rng, today: string): Patient[] {
  const used = new Set<string>()
  const nameFor = (age: number, sex: 'male' | 'female') => {
    const first = age < 12 ? (sex === 'female' ? GIRLS : BOYS) : sex === 'female' ? FEMALE : MALE
    for (;;) {
      const name = `${rng.pick(first)} ${rng.pick(SURNAMES)}`
      if (!used.has(name)) {
        used.add(name)
        return name
      }
    }
  }

  const plan = rng.shuffle(agePlan(rng))
  // The template preview shows the first patient: an adult with every detail filled in.
  const adult = plan.findIndex(([age]) => age >= 35 && age <= 60)
  ;[plan[0], plan[adult]] = [plan[adult], plan[0]]

  let crm = 10_240
  return plan.map(([age, sex], i): Patient => {
    crm += rng.int(3, 41)
    const long = i > 0 ? LONG_NAMES.find((_, k) => [7, 23, 41][k] === i) : undefined
    // Two patients registered by phone, without a date of birth yet.
    const noBirthDate = i === 16 || i === 47
    const birth = addDays(today, -Math.round(age * 365.25 + rng.int(30, 330)))
    return {
      id: `p-${i + 1}`,
      crm_client_id: crm,
      full_name: long ? long[0] : nameFor(age, sex),
      birth_date: noBirthDate ? null : birth,
      sex: long ? long[1] : sex,
    }
  })
}
