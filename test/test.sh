### initialize everything

# start a master on 8000

# start a peer, Alice, on 8001

# clear alice bob and carlos cache directories

# startthem

# get sherlockholmes 0 from Alice

# get next 5 from Alice

# get next 5 from Alice, but out of order (parallel)

# barrier (checkpoint)

# get sherlockholmes from Bob 
  # he should fetch it from Alice

# get a lot more sherlockholmes from Bob
  # he should switch from Alice to master after exhausting all of Alice's chunks

# get sherlockholmes 0 from carlos, who should fetch it from alice

# get sherlockholmes (a lot of them) from carlos
  # he should first fetch them from Alice
  # then switch to Bob
  # then switch to master

# fault-tolerance test
# KILL ALICE
# check if master notices

# get sherlockholmes from Bob
# he should not request Alice
# he should start fetching them from Carlos
# but wait, CARLOS KILLED in the middle of streaming

# shut down cleanly