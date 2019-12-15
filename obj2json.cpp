#include <fstream>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <tuple>
#include <vector>

using namespace std;

constexpr bool apxeq(float A, float B) {
  return B - 1e-6f < A && A < B + 1e-6f;
}

struct V3 {
  float x, y, z;
  V3 operator *(float s) const { return {s * x, s * y, s * z}; }
  V3 operator +(const V3& B) const { return {x + B.x, y + B.y, z + B.z}; }
  V3 operator -(const V3& B) const { return {x - B.x, y - B.y, z - B.z}; }
  float l2() const { return dot(*this, *this); }
  float l1() const { return sqrt(l2()); }
  V3 nrm() const { return *this * (1 / l1()); }
  friend float dot(const V3& A, const V3& B) {
    return A.x * B.x + A.y * B.y + A.z * B.z;
  }
  friend V3 crs(const V3& A, const V3& B) {
    return {
      A.y * B.z - A.z * B.y,
      A.z * B.x - A.x * B.z,
      A.x * B.y - A.y * B.x,
    };
  }
};

istream& operator >>(istream& I, V3& V) {
  return I >> V.x >> V.y >> V.z;
}

ostream& operator <<(ostream& O, const V3& V) {
  return O << '(' << V.x << ',' << V.y << ',' << V.z << ')';
}

struct V2 {
  float x, y;
  V2 operator *(float s) const { return {s * x, s * y}; }
  V2 operator +(const V2& B) const { return {x + B.x, y + B.y}; }
  V2 operator -(const V2& B) const { return {x - B.x, y - B.y}; }
  float l2() const { return dot(*this, *this); }
  float l1() const { return sqrt(l2()); }
  V2 nrm() const { return *this * (1 / l1()); }
  friend float dot(const V2& A, const V2& B) { return A.x * B.x + A.y * B.y; }
  friend float crs(const V2& A, const V2& B) { return A.x * B.y - A.y * B.x; }
};

istream& operator >>(istream& I, V2& V) {
  return I >> V.x >> V.y;
}

ostream& operator <<(ostream& O, const V2& V) {
  return O << '(' << V.x << ',' << V.y << ')';
}

struct Vp {
  int v, n, u;
};

struct Obj {
  vector<V3> V;
  vector<V3> N;
  vector<V2> U;
  vector<vector<Vp>> F;
};

Obj ReadObj(istream& I) {
  string Line, Key;
  Obj Res;
  Res.V.resize(1);
  Res.N.resize(1);
  Res.U.resize(1);
  int Ln = 0;
  while (getline(I, Line)) {
    ++Ln;
    istringstream L(Line);
    L >> ws;
    if (L.eof())
      continue;
    L >> Key;
    if (!Key.empty() && Key[0] == '#')
      continue;
    if (Key == "s") continue;
    if (Key == "usemtl") continue;
    if (Key == "g") cout << Line << endl;
    if (Key == "o") cout << Line << endl;
    if (Key == "v") {
      Res.V.emplace_back();
      L >> Res.V.back() >> ws;
      if (!L.eof())
        cerr << "Trailing chars at line " << Ln << endl;
      continue;
    }
    if (Key == "vn") {
      Res.N.emplace_back();
      L >> Res.N.back() >> ws;
      if (!L.eof())
        cerr << "Trailing chars at line " << Ln << endl;
      continue;
    }
    if (Key == "vt") {
      Res.U.emplace_back();
      L >> Res.U.back() >> ws;
      if (!L.eof())
        cerr << "Trailing chars at line " << Ln << endl;
      continue;
    }
    if (Key == "f") {
      Res.F.emplace_back();
      auto& F = Res.F.back();
      while (!L.eof()) {
        int v = 0, n = 0, u = 0;
        L >> v >> ws;
        if (L.peek() == '/') {
          L.get();
          if (L.peek() != '/')
            L >> u >> ws;
          if (L.peek() == '/') {
            L.get();
            L >> n >> ws;
          }
        }
        F.emplace_back(Vp{v, n, u});
      }
      if (F.size() < 3) {
        cerr << "A face with size " << F.size() <<
          " (will be ignored) found at line " << Ln << endl;
        Res.F.pop_back();
        continue;
      }
      if (F.size() > 4) {
        cerr << "A face with size " << F.size() <<
          " found at line " << Ln << endl;
        Res.F.pop_back();
      }
      continue;
    }
    cerr << "Unknown key \'" << Key << "\' at line " << Ln << endl;
  }
  return Res;
}

struct Json {
  vector<float> V;
  void Add(const V3& W) {
    V.emplace_back(W.x);
    V.emplace_back(W.y);
    V.emplace_back(W.z);
  }
  void Add(const V2& W) {
    V.emplace_back(W.x);
    V.emplace_back(W.y);
  }
};

V3 GetNormal(const vector<V3>& Ns, int n, int i, int nf) {
  if (!nf) {
    cerr << "No normal specified for vertex [" << n <<
      "," << i << "], will use surface normal instead" << endl;
  }
  auto N = Ns[nf];
  auto l1 = N.l1();
  if (apxeq(l1, 0)) {
    cerr << "Zero normal for vertex [" << n << "," << i <<
      "], will use surface normal" << endl;
    return Ns[0];
  }
  if (!apxeq(l1, 1)) {
    cerr << "Unnormalized normal for vertex [" << n << "," << i <<
      "], will normalize" << endl;
    return N.nrm();
  }
  return N;
}

Json ToJson(Obj& O) {
  Json Res;
  auto Add = [&](const V3& V, const V3& N, const V3& T, const V2& U) {
    Res.Add(V);
    Res.Add(N);
    Res.Add(T);
    Res.Add(U);
  };
  auto n = 0;
  for (auto& F : O.F) {
    auto V0 = O.V[F[0].v];
    auto V1 = O.V[F[1].v];
    auto V2 = O.V[F[2].v];
    O.N[0] = crs(V1 - V0, V2 - V0);
    if (apxeq(O.N[0].l1(), 0)) {
      cerr << "Zero surface normal for face " << n <<
        ", will use (0,0,1) instead" << endl;
      O.N[0] = {0, 0, 1};
    }
    else
      O.N[0] = O.N[0].nrm();
    auto U0 = O.U[F[0].u];
    auto N0 = GetNormal(O.N, n, 0, F[0].n);
    for (auto i = 2; i < F.size(); ++i) {
      auto N1 = GetNormal(O.N, n, i - 1, F[i - 1].n);
      auto N2 = GetNormal(O.N, n, i, F[i].n);
      auto V1 = O.V[F[i - 1].v];
      auto V2 = O.V[F[i].v];
      auto U1 = O.U[F[i - 1].u];
      auto U2 = O.U[F[i].u];
      auto V01 = V1 - V0;
      auto V02 = V2 - V0;
      auto U01 = U1 - U0;
      auto U02 = U2 - U0;
      auto r = crs(U01, U02);
      auto T = r != 0 ? (V01 * U02.y - V02 * U01.y) * (1 / r) :
        fabs(N2.x) < fabs(N2.y) ?
        crs(N2, {1, 0, 0}).nrm() : crs(N2, {0, 1, 0}).nrm();
      if (!isfinite(T.x) || !isfinite(T.y) || !isfinite(T.z)) {
        cerr << "Invalid tangent for vertex [" << n << "," << i << "]" << endl;
        cerr << "  T=" << T << endl;
        cerr << "  V0=" << V0 << " N0=" << N0 << " U0=" << U0 << endl;
        cerr << "  V1=" << V1 << " N1=" << N1 << " U1=" << U1 << endl;
        cerr << "  V2=" << V2 << " N2=" << N2 << " U2=" << U2 << endl;
        cerr << "  r= " << r << " 1/r=" << (1 / r) << endl;
        cerr << "  N2xX=" << crs(N2, {1, 0, 0}) << endl;
        cerr << "  N2xY=" << crs(N2, {0, 1, 0}) << endl;
      }
      Add(V0, N0, T, U0);
      Add(V1, N1, T, U1);
      Add(V2, N2, T, U2);
    }
    ++n;
  }
  return Res;
}

void WriteJson(ostream& O, Json& J) {
  O << '[';
  bool f = true;
  for (auto v : J.V) {
    if (f)
      f = false;
    else
      O << ',';
    O << v;
  }
  O << ']';
}

int main(int NArg, char* Args[]) {
  if (NArg != 3) {
    cerr << "Usage: " << Args[0] << " <In>.obj <Out>.json" << endl;
    return 1;
  }
  ifstream In(Args[1]);
  if (!In) {
    cerr << "Failed to open \'" << Args[1] << "\' for reading";
    return 1;
  }
  auto O = ReadObj(In);
  In.close();
  auto J = ToJson(O);
  ofstream Out(Args[2]);
  if (!Out) {
    cerr << "Failed to open \'" << Args[1] << "\' for writing";
    return 1;
  }
  WriteJson(Out, J);
  Out.close();
  cout << "  Floats: " << J.V.size() << endl;
  cout << "Vertices: " << J.V.size() / 11 << endl;
  cout << "All done" << endl;
  return 0;
}
