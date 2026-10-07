# Cross-check report (independent Python recomputation, full-grid sweep)

grid.json sha256: 4d03b0c056019b3b7037a1036bfa51b2c441a46350d34c6da1a779276ae651af
Grid rows: 7154 (0-48 mo; both sexes; weights 2-20 kg, step 0.25)
Fields compared per row: A, Alo, Ahi, B, C, Clo, Chi, D, Dlo, Dhi, fluid (11 fields)
Values compared: 77420 (expected >= 71540; B is null by design where the weight is outside the WHO weight-for-age range: 1274 rows)
Null-pair (grid=NULL, recomputed=NULL) counts: {"A": 0, "Alo": 0, "Ahi": 0, "B": 1274, "C": 0, "Clo": 0, "Chi": 0, "D": 0, "Dlo": 0, "Dhi": 0, "fluid": 0}
Null mismatches (one side null, other not): 0
Worst relative difference: 0.000000% (boys 23mo 2kg Dhi: grid=517.2592 rec=517.2592)
Acceptance (0 failures > 0.5%, 0 null mismatches, count >= expected): PASS

Note: constants are duplicated from the same published sources by design (two independent implementations);
the grid hash above pins exactly which artifact this report validated.
