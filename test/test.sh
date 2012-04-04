cd `dirname $0`

for f in *.js
do
  echo "*** $f"
  node $f
done