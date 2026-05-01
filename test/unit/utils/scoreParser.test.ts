import { parseTennisScore } from '@/utils/scoreParser'

describe('scoreParser: parseTennisScore', () => {
  it('returns empty array when input is empty', () => {
    expect(parseTennisScore('')).toEqual([])
  })

  it('filters out non-digits from input and returns correct sets', () => {
    // "6-4, 6-2" -> "6462" -> [{p1:6, p2:4}, {p1:6, p2:2}]
    expect(parseTennisScore('6-4, 6-2')).toEqual([
      { p1: 6, p2: 4 },
      { p1: 6, p2: 2 }
    ])
    expect(parseTennisScore('abc6.def4')).toEqual([
      { p1: 6, p2: 4 }
    ])
  })

  it('parses standard 2 sets correctly', () => {
    expect(parseTennisScore('6463')).toEqual([
      { p1: 6, p2: 4 },
      { p1: 6, p2: 3 }
    ])
  })

  it('parses 7-6 tiebreaks and assigns tiebreak score properly', () => {
    // 7675 -> Set 1: 7-6 (tb 7-5)
    expect(parseTennisScore('7675')).toEqual([
      { p1: 7, p2: 6, tb1: 7, tb2: 5 }
    ])
    
    // 6747 -> Set 1: 6-7 (tb 4-7)
    expect(parseTennisScore('6747')).toEqual([
      { p1: 6, p2: 7, tb1: 4, tb2: 7 }
    ])
  })

  it('handles Tiebreak past 7 points (difference of 2)', () => {
    // 76108 -> Set 1: 7-6 (tb 10-8)
    expect(parseTennisScore('76108')).toEqual([
      { p1: 7, p2: 6, tb1: 10, tb2: 8 }
    ])

    // 6786 -> Set 1: 6-7 (tb 8-6)
    expect(parseTennisScore('6786')).toEqual([
      { p1: 6, p2: 7, tb1: 8, tb2: 6 }
    ])
  })

  it('parses match with Tiebreak in 2nd set', () => {
    // 64 7674 -> Set 1: 6-4, Set 2: 7-6(7-4)
    expect(parseTennisScore('647674')).toEqual([
      { p1: 6, p2: 4 },
      { p1: 7, p2: 6, tb1: 7, tb2: 4 }
    ])
  })

  it('detects third set as super-tiebreak when it starts with 10 or 11', () => {
    // 64 46 10-8  -> 6446108
    expect(parseTennisScore('6446108')).toEqual([
      { p1: 6, p2: 4 },
      { p1: 4, p2: 6 },
      { p1: 10, p2: 8 }
    ])

    // 46 63 11-9 -> 4663119
    expect(parseTennisScore('4663119')).toEqual([
      { p1: 4, p2: 6 },
      { p1: 6, p2: 3 },
      { p1: 11, p2: 9 }
    ])
  })

  it('detects third set as super-tiebreak when it ends with 10 or 12', () => {
    // 64 46 8-10 -> 6446810
    expect(parseTennisScore('6446810')).toEqual([
      { p1: 6, p2: 4 },
      { p1: 4, p2: 6 },
      { p1: 8, p2: 10 }
    ])
    
    // 46 63 10-12 -> 46631012 -> starts with 10, so first part hits? 
    // wait, 1012 starts with 10, so p1: 10, p2: 12  -> This is theoretically supported by the algorithm
    expect(parseTennisScore('46631012')).toEqual([
      { p1: 4, p2: 6 },
      { p1: 6, p2: 3 },
      { p1: 10, p2: 12 }
    ])
  })

  it('handles partial uneven inputs gracefully', () => {
    // "6" -> Should return [] because while loop tries to grab `i+1`.
    expect(parseTennisScore('6')).toEqual([])
    
    // "646" -> Should return [{p1:6, p2:4}] because trailing 6 doesn't have a pair
    expect(parseTennisScore('646')).toEqual([
      { p1: 6, p2: 4 }
    ])
  })

  it('does not apply tiebreak heuristical parsing if it is not a tiebreak score condition', () => {
    // 7660 -> Set 1: 7-6 (no tb inside, because 6-0 is not a valid tb logic, or is it? p1:6, p2:0 triggers isTiebreakScore? (p1>=6 && p2>=6) is false, (p1===7... is false)
    // Wait, let's see. If the code parses "7660", tb logic expects something.
    // 6-0 tiebreak? In tennis tb must win by reaching 7. So 6-0 is not a valid finished tiebreak.
    expect(parseTennisScore('7660')).toEqual([
      { p1: 7, p2: 6 },
      { p1: 6, p2: 0 }
    ])
  })
})
