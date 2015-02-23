### initialize everything
set -e
trap "kill 0" SIGINT SIGTERM EXIT

# start a master on 8000
MASTERPORT=8000
MASTER=tcp://0.0.0.0:$MASTERPORT
echo "STARTING MASTER ON $MASTERPORT"
node node.js --name master --port $MASTERPORT > test/testoutput/master.log &
sleep 1;

# start a peer, Alice, on 8001
ALICEPORT=8001
BOBPORT=8002
CARLOSPORT=8003
ALICE=tcp://0.0.0.0:$ALICEPORT
BOB=tcp://0.0.0.0:$BOBPORT
CARLOS=tcp://0.0.0.0:$CARLOSPORT

# clear alice bob and carlos cache directories
ALICECHUNKS=test/chunks/alicechunks
BOBCHUNKS=test/chunks/bobchunks
CARLOSCHUNKS=test/chunks/carloschunks

rm -rf $ALICECHUNKS
rm -rf $BOBCHUNKS
rm -rf $CARLOSCHUNKS

mkdir $ALICECHUNKS
mkdir $BOBCHUNKS
mkdir $CARLOSCHUNKS

# startthem
echo "STARTING ALICE ON $ALICEPORT"
node node.js --port $ALICEPORT  --name alice  --master $MASTER --chunkdirectory $ALICECHUNKS  > test/testoutput/alice.log &
ALICEPID=$!

echo "STARTING BOB ON $BOBPORT"
node node.js --port $BOBPORT    --name bob    --master $MASTER --chunkdirectory $BOBCHUNKS    > test/testoutput/bob.log &
BOBPID=$!

echo "STARTING CARLOS ON $CARLOSPORT"
node node.js --port $CARLOSPORT --name carlos --master $MASTER --chunkdirectory $CARLOSCHUNKS > test/testoutput/carlos.log &
CARLOSPID=$!

sleep 1;

# get sherlockholmes 0 from Alice
echo "Getting sherlockholmes, 0 from alice"
  OUTPUT=`zerorpc -j -pj $ALICE get \"sherlockholmes\" 0 true null | tail -n1`;
  SID1=`echo $OUTPUT | jq -r .streamId`;
  echo $OUTPUT;
  echo $SID1;

# get next 5 from Alice
echo "Geting sherlockholmes 1..5 from alice"
for i in {1..5}
do
  echo `zerorpc -j -pj $ALICE get \"sherlockholmes\" $i true \"$SID1\" | tail -n1`;
done


# get next 5 from Alice, but out of order (parallel)
echo "Getting sherlockholmes 10..6 from alice, out of order parallel"
for i in {10..6}
do
  echo `zerorpc -j -pj $ALICE get \"sherlockholmes\" $i true \"$SID1\" | tail -n1` &
  OOOGA[$i]=$!;
done

# barrier (checkpoint)
for ooo in "${OOOGA[@]}"
do
  wait $ooo
done

echo "Great."

# get sherlockholmes from Bob 
  # he should fetch it from Alice
echo "Getting sherlockholmes, 5 from bob, who should get it from ALICE"
  OUTPUT=`zerorpc -j -pj $BOB get \"sherlockholmes\" 5 true null | tail -n1`;
  SID2=`echo $OUTPUT | jq -r .streamId`;
  echo $OUTPUT;
  echo $SID2;

# get a lot more sherlockholmes from Bob
  # he should switch from Alice to master after exhausting all of Alice's chunks
echo "Geting sherlockholmes 6..25 from bob, he should get some from Alice, then switch to master"
  for i in {6..25}
  do
    echo `zerorpc -j -pj $BOB get \"sherlockholmes\" $i true \"$SID2\" | tail -n1`;
  done

# get sherlockholmes 0 from carlos, who should fetch it from alice
echo "Getting sherlockholmes, 0 from carlos, who should get it from ALICE"
  OUTPUT=`zerorpc -j -pj $CARLOS get \"sherlockholmes\" 0 true null | tail -n1`;
  SID3=`echo $OUTPUT | jq -r .streamId`;
  echo $OUTPUT;
  echo $SID3;

# get sherlockholmes (a lot of them) from carlos
  # he should first fetch them from Alice
  # then switch to Bob
  # then switch to master
echo "Geting sherlockholmes 1..50 from carlos, he should get some from Alice, then switch to bob when alice runs out then switch to the master when bob runs out"
  for i in {1..50}
  do
    echo `zerorpc -j -pj $CARLOS get \"sherlockholmes\" $i true \"$SID3\" | tail -n1`;
  done

# fault-tolerance test
# KILL ALICE
# check if master notices

# get sherlockholmes from Bob
# he should not request Alice
# he should start fetching them from Carlos
# but wait, CARLOS KILLED in the middle of streaming

# shut down 
echo "All done"

# great.
wait;