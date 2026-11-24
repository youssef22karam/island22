3 lakeRim=vec3(.12,.48,.46);
  vec3 lakeMid=mix(vec3(.032,.235,.268),vec3(.011,.108,.148),smoothstep(2.4,9.5,depth));
  vec3 lakeDeep=vec3(.004,.034,.068);
  vec3 lakeBody=mix(lakeMid,lakeDeep,smoothstep(7.8,20.,depth));
  lakeBody=mix(lakeBody,lakeRim,(1.-smoothstep(.22,3.0,depth))*.68);

  // 2) River: sunlit warm jade-amber over crystal pebbles -> rich mountain-river emerald-teal -> deep dark-jade thalweg
  vec3 rivShoal=mix(vec3(.145,.285,.205),vec3(.215,.255,.142),sed*.52);
  vec3 rivMid=mix(vec3(.026,.168,.142),vec3(.048,.142,.098),sed*.46);
  vec3 rivDeep=mix(vec3(.008,.062,.068),vec3(.018,.058,.044),sed*.44);
  vec3 rivBody=mix(rivMid,rivDeep,smoothstep(3.2,11.5,depth));
  rivBody=mix(rivBody,rivShoal,(1.-smoothstep(.16,1.8,depth))*.58);

  // 3) Swamp: unmistakable moody translucent tea-amber margin -> haunting deep steeped olive-obsidian mirror blackwater!
  vec3 swRim=vec3(.092,.108,.040);
  vec3 swMid=vec3(.022,.038,.014);
  vec3 swDeep=vec3(.006,.012,.006);
  vec3 swBody=mix(mix(swRim,swMid,smoothstep(.15,1.05,depth)),swDeep,smoothstep(.95,2.8,depth));

  vec3 bodyCol=lakeBody*lakeW+rivBody*riverW+swBody*swampW;
  bodyCol=mix(bodyCol,mix(vec3(.14,.13,.078),vec3(.085,.078,.045),swampW),rainSilt*(.26+.48*riverW+.20*swampW));

  // Rich dramatic wave-facet contrast on running rivers (bright sky reflections vs deep cool emerald wave slopes!)
  float slopeContrast=dot(N.xz,normalize(uSun.xz+vec2(.001)));
  float facetShift=clamp(slopeContrast*3.2,-1.,1.)*riverW*detail;
  bodyCol*=1.+.20*facetShift;

  // True physical red-first spectral Beer-Lambert transmittance calibrated so our living kelp3 forest,
  // golden-amber streaming ribbons, rounded river pebbles, coral-crusted boulders, dancing Voronoi caustics
  // & shimmering silver/gold fish gleam unmistakably right beneath crystal clear lakes and rivers!
  vec3 extLake=vec3(.30,.142,.132);
  vec3 extRiver=mix(vec3(.36,.195,.205),vec3(.56,.36,.44),sed*.52);
  vec3 extSwamp=vec3(1.05,.96,1.55); // steeped amber-tannin kills blue first, creating luminous dark tea water!
  vec3 ext=(extLake*lakeW+extRiver*riverW+extSwamp*swampW)*(1.+rainSilt*.95);
  vec3 transmit=exp(-ext*optPath);
  float avgTrans=dot(transmit,vec3(.28,.48,.24));

  // Delicate vibrant jewel aquamarine/emerald internal sun scattering inside rippling slopes
  float sunBack=pow(clamp(dot(-V,uSun)*.5+.5,0.,1.),3.2);
  vec3 sssCol=mix(vec3(.032,.26,.24),vec3(.048,.22,.14),riverW)*(1.-swampW*.90);
  vec3 sss=sssCol*(.18+.82*sunBack)*uSunCol*sunVis*(.10+.18*min(length(slope)*3.8,1.2))*(1.-F)*(1.-smoothstep(3.0,14.,depth)*.40);

  // Live crisp Snell-refracted bed/kelp/fish + subtle prism chromatic shimmer on sunlit ripples!
  vec3 bodyLit=bodyCol*(1.-transmit)*lit;
  vec3 color=reflection*F+glitter+bodyLit*(1.-F)+sss;
  float validRefract=0.;
  if(uRefractionActive>.5&&dist<320.){
    float bendAmt=min(depth,5.0)*mix(.22,.28,riverW)*smoothstep(.04,.55,depth)/(1.+dist*.010);
    vec2 disp=N.xz*bendAmt;
    vec4 q=uRefractionMatrix*vec4(vP.x+disp.x,vLevel-min(depth,2.8)*.10,vP.z+disp.y,1.);
    vec2 ruv=q.xy/max(q.w,.001);
    float bOk=smoothstep(.004,.024,ruv.x)*(1.-smoothstep(.976,.996,ruv.x))
      *smoothstep(.004,.024,ruv.y)*(1.-smoothstep(.976,.996,ruv.y))*step(0.,q.w);
    validRefract=bOk*(1.-smoothstep(230.,315.,dist));
    if(validRefract>.001){
      vec2 dispCh=N.xz*.0022*shallow*(1.-swampW)*detail;
      vec3 through;
      through.r=texture2D(uRefraction,clamp(ruv+dispCh,.004,.996)).r;
      through.g=texture2D(uRefraction,clamp(ruv,.004,.996)).g;
      through.b=texture2D(uRefraction,clamp(ruv-dispCh,.004,.996)).b;
      // Dancing shallow sunlight caustic flash highlighting golden kelp, boulders & fish below
      float cMask=(1.-smoothstep(1.0,6.8,depth))*(1.-swampW*.68)*sunVis*detail;
      float cSpark=pow(clamp(n2*.55+n3*.45,0.,1.),3.1)*cMask;
      through+=uSunCol*cSpark*mix(vec3(.22,.32,.27),vec3(.26,.30,.17),riverW)*.54;
      color+=through*transmit*(1.-F)*validRefract;
    }
  }
  // True physical alpha transparency whenever viewing outside live refraction target (including elevated vistas!)
  float hwTrans=avgTrans*(1.-F)*(1.-validRefract);
  float alpha=clamp(1.-hwTrans,.08,1.);
  if(validRefract<.5&&depth<6.0){
    float fCaus=(1.-smoothstep(.6,5.8,depth))*(1.-swampW*.72)*sunVis*(1.-smoothstep(180.,460.,dist));
    color+=uSunCol*pow(max(n2*.58+n3*.42,0.),3.3)*fCaus*.16*(1.-F)*(1.-validRefract);
  }

  // ---- Silk-fine river flow seams, gentle shallow cobble riffles & broken foamy meniscus ----
  float foam=0.;
  if(dist<620.){
    float fFade=1.-smoothstep(.55,2.9,pixel);
    vec2 fd=flow/max(speed,1e-4),fn=vec2(-fd.y,fd.x);
    float T=2.4,cy=uTime/T,f0=fract(cy),f1=fract(cy+.5),w0=1.-abs(2.*f0-1.);
    vec2 pa=vP.xz-flow*f0*T*1.6,pb=vP.xz-flow*f1*T*1.6+vec2(9.3,4.7);
    float stA=fwN(vec2(dot(pa,fd)*.082,dot(pa,fn)*.76))*.62+fwN(pa*.54)*.38;
    float stB=fwN(vec2(dot(pb,fd)*.082,dot(pb,fn)*.76))*.62+fwN(pb*.54)*.38;
    float stN=stA*w0+stB*(1.-w0);
    float lace=smoothstep(.42,.82,n2*.55+n3*.45);
    // Domain-warped organic winding downstream foam currents & silky faint eddy filaments (zero straight lines!)
    vec2 wEddy=vec2(fwN(vP.xz*.075+uTime*.04)-.5,fwN(vP.xz*.075+6.3-uTime*.035)-.5)*3.8;
    float curS=fwN(vec2(dot(pa+wEddy,fd)*.065,dot(pa+wEddy,fn)*.34))*w0+fwN(vec2(dot(pb+wEddy,fd)*.065,dot(pb+wEddy,fn)*.34))*(1.-w0);
    float eddySilk=riverW*smoothstep(.20,.62,speed)*smoothstep(.70,.90,curS)*smoothstep(.3,1.4,depth);
    color+=vec3(.07,.13,.12)*eddySilk*lit*(1.-uStorm*.45)*.45;
    foam=max(foam,eddySilk*smoothstep(.78,.93,curS)*lace*.32);
    // Airy sparkling riffle whitewater strictly on quick shallow shingle zones (0.08..0.88 m)
    float riffZone=riverW*smoothstep(.20,.68,speed)*(1.-smoothstep(.18,.88,depth))*smoothstep(.04,.16,depth);
    foam=max(foam,smoothstep(.54,.80,stN*.65+n3*.35)*riffZone*lace*.64);
    // Delicate intermittent foam lace gently lapping curved banks & cobble point bars
    float edgeW=(1.-smoothstep(.03,.34,depth))*smoothstep(.008,.04,depth)*(1.-swampW*.84);
    float edgeBreak=smoothstep(.48,.78,fwN(vP.xz*.28-flow*uTime*.12)*.65+n2*.35);
    foam=max(foam,edgeW*edgeBreak*(.14+.36*riverW+.13*uWindAmt*lakeW));
    // Crisp soft lake wind-foam streaks during brisk winds
    foam=max(foam,lakeW*smoothstep(.54,.98,uWindAmt)*gust*smoothstep(.76,.92,n1*.6+n3*.4)*.40);
    // Live dynamic boat wake lace
    foam=clamp(max(foam,vWake*smoothstep(.16,.72,n1*.5+n2*.55))*fFade,0.,.88);
  }
  if(foam>.004){
    vec3 fTint=mix(vec3(.90,.95,.94),vec3(.86,.86,.78),swampW*.6+rainSilt*.35);
    vec3 fLit=fTint*(uSunCol*.46*(1.-uStorm*.72)+hzSoft()*.48*lit+vec3(.015,.02,.028)*uNight);
    color=mix(color,fLit,foam);
    alpha=mix(alpha,1.,foam);
  }

  // ---- Atmospheric floating swamp layer: winding open dark mirrors + lacy duckweed, lettuce & lilies ----
  float slowM=swampW*smoothstep(.04,.20,depth)*(1.-smoothstep(.30,.62,speed))*(1.-rainSilt*.42);
  if(slowM>.02&&dist<560.){
    vec2 wp=vP.xz+vec2(fwN(vP.xz*.030+1.9)-.5,fwN(vP.xz*.030+7.4)-.5)*16.+flow*uTime*.018;
    // Serpentine mirror-dark navigable channels carved organically through luminous lacy swamp botanicals
    float chan=abs(fwN(wp*.028+vec2(3.7,-2.8))-.5);
    float keepRaft=smoothstep(.062,.16,chan);
    float hugBank=.74+.26*(1.-smoothstep(.6,3.4,depth));
    float macroR=fwN(wp*.075)*.54+fwN(wp*.21+4.3)*.46;
    float microF=1.-smoothstep(.12,.78,pixel);
    float microR=mix(.58,fwN(vP.xz*1.9)*.56+fwN(vP.xz*5.8+2.3)*.44,microF);
    float cf=macroR*keepRaft*hugBank*(.74+.26*microR);
    float halo=smoothstep(.29,.43,cf)*slowM;
    float mat=smoothstep(.37,.51,cf)*slowM*(.84+.16*smoothstep(.26,.70,microR));
    if(halo>.005) color*=1.-.42*halo*(1.-mat*.6);
    if(mat>.005){
      float tx=mix(.5,fwN(vP.xz*2.9)*.58+fwN(vP.xz*8.8+1.2)*.42,microF);
      float letM=smoothstep(.56,.75,fwN(wp*.31+8.4))*mat;
      float padM=smoothstep(.60,.78,fwN(wp*.21-3.9))*(1.-letM*.72)*mat;
      vec3 duckC=mix(vec3(.19,.32,.062),vec3(.34,.46,.108),tx);
      vec3 letC=mix(vec3(.24,.40,.095),vec3(.39,.51,.148),tx);
      vec3 padC=mix(vec3(.085,.215,.046),vec3(.18,.315,.076),tx);
      vec3 al=mix(mix(duckC,letC,letM),padC,padM);
      vec3 pN=normalize(vec3((tx-.5)*.32,1.,(fwN(vP.xz*2.9+4.2)-.5)*.32));
      float pSun=max(dot(pN,uSun),0.);
      vec3 matLit=al*(hzSoft()*(.38+.15*pN.y)*lit+uSunCol*pSun*.62*(1.-uStorm*.68)+vec3(.01,.015,.02)*uNight);
      matLit+=uSunCol*pow(max(dot(pN,H),0.),44.)*padM*.18*sunVis;
      matLit*=.76+.24*smoothstep(.04,.42,mat);
      color=mix(color,matLit,clamp(mat*.90,0.,1.));
      alpha=mix(alpha,1.,clamp(mat*.96,0.,1.));
    }
  }

  // Ultra-silky feather kissing every sculpted curve of sand, pebbles, moss & dark rock banks
  float shoreFeather=smoothstep(.005,.09,depth)*vEdge;
  color*=1.-.10*(1.-smoothstep(.01,.16,depth))*smoothstep(.005,.02,depth);

  // Subtle lyrical morning/golden-hour bayou mist drifting faintly above swamps & serene channels
  float mistWisp=.65+.35*fwN(vP.xz*.012+vec2(uTime*.010,-uTime*.007));
  float valleyMist=(uTwi*.0024+uDay*.00038)*(1.-uNight)*(.26+swampW*.95)*mistWisp*exp(-max(cameraPosition.y-vLevel,0.)*.07);
  float fog=1.-exp(-dist*(uFog+valleyMist));
  color=mix(color,horizon(),fog);
  alpha=mix(alpha,1.,fog);
  alpha*=shoreFeather;
  color*=shoreFeather;

  gl_FragColor=vec4(color/max(alpha,.0001),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb*=gl_FragColor.a;
}`;
function Ir(o, e) {
  let t = buildFreshwaterGeometry(o),
    r = new Qe.ShaderMaterial({
      uniforms: e,
      vertexShader: mi,
      fragmentShader: fi,
      transparent: !0,
      depthWrite: !1,
      side: Qe.DoubleSide,
      blending: Qe.CustomBlending,
      blendSrc: Qe.OneFactor,
      blendDst: Qe.OneMinusSrcAlphaFactor,
      blendEquation: Qe.AddEquation,
    }),
    s = new Qe.Mesh(t, r);
  return ((s.renderOrder = 2), (s.frustumCulled = !0), s);
}
function Pr(o, e) {
  let t = Ie(o.seed ^ 305874191),
    r = [],
    s = [],
    c = Math.max(2, Math.round(o.N / 160));
  for (let m = 1; m < o.N - 1; m += c)
    for (let h = 1; h < o.N - 1; h += c) {
      let l = m * o.N + h;
      if (!(!o.wet[l] || o.swamp[l] < 0.55) && !(t() > 0.22))
        for (let u = 0; u < 3; u++)
          (r.push(
            ((l % o.N) + t()) * o.cell - o.half,
            0.12 + t() * 1.2,
            (((l / o.N) | 0) + t()) * o.cell - o.half,
          ),
            s.push(t()));
    }
  if (!r.length) return null;
  let a = new Qe.BufferGeometry();
  (a.setAttribute("position", new Qe.Float32BufferAttribute(r, 3)),
    a.setAttribute("aSeed", new Qe.Float32BufferAttribute(s, 1)));
  let n = new Qe.ShaderMaterial({
      uniforms: e,
      transparent: !0,
      depthWrite: !1,
      blending: Qe.NormalBlending,
      vertexShader: `attribute float aSeed;uniform float uTime;varying float vFade;
      void main(){vec3 p=(modelMatrix*vec4(position,1.)).xyz;
        float phase=fract(uTime*(.03+aSeed*.03)+aSeed*13.);
        p.y+=phase*(.5+aSeed*1.1);p.xz+=vec2(sin(aSeed*49.+uTime*.07),cos(aSeed*73.+uTime*.05))*4.;
        vec4 clip=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*clip;
        gl_PointSize=min(180.,(45.+aSeed*65.)*180./max(-clip.z,1.));
        float above=step(0.,cameraPosition.y);
        vFade=above*(1.-abs(phase*2.-1.))*smoothstep(4.,18.,-clip.z)*(1.-smoothstep(220.,460.,-clip.z));}`,
      fragmentShader: `varying float vFade;void main(){
      float d=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.1,1.,d))*vFade*.038;
      if(a<.001)discard;
      gl_FragColor=vec4(.88,.91,.86,a);}`,
    }),
    i = new Qe.Points(a, n);
  return ((i.renderOrder = 2.5), i);
}
var ro = 8e3,
  Vr = 400,
  Gr = 10;
function ra(o, e, t, r) {
  let s =
    (Math.imul(o | 0, 374761393) +
      Math.imul(e | 0, 668265263) +
      Math.imul(t | 0, 2246822519) +
      Math.imul(r | 0, 1597334677)) |
    0;
  return (
    (s = Math.imul(s ^ (s >>> 13), 1274126177)),
    (s ^= s >>> 16),
    (s >>> 0) / 4294967296
  );
}
function Or(o, e, t) {
  return (o === 0 && e === 0) || ra(o, e, 1, t) < 0.72;
}
function Mn(o, e, t) {
  let r = o === 0 && e === 0,
    s = [3200, 4e3, 4800, 5400],
    c = r ? 7200 : s[Math.floor(ra(o, e, 2, t) * s.length)],
    a = c / 2,
    n = Math.max(ro / 2 - a - 150, 0),
    i = (o + 0.5) * ro + (ra(o, e, 3, t) * 2 - 1) * n - ro / 2,
    m = (e + 0.5) * ro + (ra(o, e, 4, t) * 2 - 1) * n - ro / 2;
  return {
    ix: o,
    iz: e,
    key: `${o},${e}`,
    cx: i,
    cz: m,
    seed: Math.floor(ra(o, e, 9, t) * 1e9) ^ t,
    N: Math.round(c / Gr),
    cell: Gr,
    span: c,
    half: a,
    isHome: r,
  };
}
export { Ir, Mn, Or, Pr, Vr, ro };
