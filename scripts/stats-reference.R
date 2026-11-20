# Reference values for BioSketch's statistical tests, worked out in R (base and stats only).
# Run from the project folder:   Rscript scripts/stats-reference.R
# It writes tests/stats-reference.json, which tests/distributions.test.ts,
# tests/chart-tests.test.ts and the other tests that import it compare BioSketch's own arithmetic with.

A <- c(4.1, 5.3, 6.0, 5.8, 4.9, 6.4)
B <- c(6.9, 7.4, 5.9, 8.1, 7.7, 6.6)
C <- c(5.2, 9.3, 8.8, 10.1, 7.9, 9.6)
D <- c(3.3, 4.7, 5.1, 2.9)
T1 <- c(1, 2, 2, 3, 4, 4, 5)
T2 <- c(2, 3, 4, 4, 5, 6, 6, 7)
S <- c(0.8, 1.1, 1.3, 1.9, 2.4, 3.8, 7.5, 21.0)
# Paired with a tie among the changes and one row without change.
P1 <- c(10, 12, 9, 14, 11, 13, 8, 15)
P2 <- c(12, 15, 9, 13, 14, 17, 10, 19)

num <- function(v) {
  v <- unname(v)
  s <- ifelse(is.na(v), "null", sprintf("%.15g", v))
  if (length(v) == 1) s else paste0("[", paste(s, collapse = ","), "]")
}
obj <- function(...) {
  parts <- list(...)
  paste0("{", paste(sprintf("\"%s\":%s", names(parts), unlist(parts)), collapse = ","), "}")
}

htest <- function(t) obj(statistic = num(t$statistic), df = num(if (is.null(t$parameter)) NA else t$parameter), p = num(t$p.value))

# ---- distributions ----
# ptukey is left out where R's own function is approximate: beyond 25000 degrees of freedom it
# uses the value for infinitely many, and for a large range with very few degrees of freedom it
# is good to three or four digits only. tests/distributions.test.ts checks those against SciPy.
dist <- obj(
  pt2 = num(c(2 * pt(-2.3, 7.4), 2 * pt(-0.01, 3), 2 * pt(-12, 2.5), 2 * pt(-1.96, 120000), 2 * pt(-5, 1))),
  pf = num(c(pf(5.1, 2, 12, lower.tail = FALSE), pf(0.3, 4, 7.5, lower.tail = FALSE), pf(40, 1, 3, lower.tail = FALSE), pf(1.2, 23, 60000, lower.tail = FALSE))),
  pchisq = num(c(pchisq(7.2, 2, lower.tail = FALSE), pchisq(0.4, 5, lower.tail = FALSE), pchisq(60, 3, lower.tail = FALSE), pchisq(25, 23, lower.tail = FALSE))),
  pnorm = num(c(pnorm(-1.96), pnorm(0.3), pnorm(-8), pnorm(4.5), pnorm(0))),
  qnorm = num(c(qnorm(0.025), qnorm(0.5), qnorm(0.9), qnorm(1e-9), qnorm(0.31))),
  ptukey = num(c(
    ptukey(3.5, 3, 12, lower.tail = FALSE), ptukey(1.2, 4, 20, lower.tail = FALSE), ptukey(6, 5, 8, lower.tail = FALSE),
    ptukey(2.8, 2, 10, lower.tail = FALSE), ptukey(4.2, 10, 60, lower.tail = FALSE), ptukey(3, 3, 2, lower.tail = FALSE),
    ptukey(5, 24, 500, lower.tail = FALSE), ptukey(3.3, 6, 2000, lower.tail = FALSE), ptukey(9, 4, 5, lower.tail = FALSE),
    ptukey(0.4, 3, 15, lower.tail = FALSE)
  )),
  pwilcox = num(c(pwilcox(4, 6, 6), pwilcox(10, 4, 8), pwilcox(0, 3, 3), pwilcox(600, 40, 45), pwilcox(1200, 49, 49))),
  psignrank = num(c(psignrank(3, 8), psignrank(0, 5), psignrank(40, 15), psignrank(500, 49)))
)

# ---- two groups ----
# Signed-rank tests are run with digits.rank = 12: changes that are equal on paper (4.1 - 6.9 and
# 4.9 - 7.7) differ in their last binary digit, and R's default would not count them as ties.
# BioSketch rounds differences to 12 significant digits for the same reason. srABnoisy is R's
# default on the same data, kept to show the difference.
two <- obj(
  welchAB = htest(t.test(A, B)),
  welchAD = htest(t.test(A, D)),
  pairedAB = htest(t.test(A, B, paired = TRUE)),
  pairedP = htest(t.test(P1, P2, paired = TRUE)),
  mwAB = htest(wilcox.test(A, B)),
  mwAD = htest(wilcox.test(A, D)),
  mwTies = htest(suppressWarnings(wilcox.test(T1, T2))),
  mwAS = htest(wilcox.test(A, S)),
  srAB = htest(suppressWarnings(wilcox.test(A, B, paired = TRUE, digits.rank = 12))),
  srABnoisy = htest(wilcox.test(A, B, paired = TRUE)),
  srP = htest(suppressWarnings(wilcox.test(P1, P2, paired = TRUE, digits.rank = 12))),
  srAC = htest(wilcox.test(A, C, paired = TRUE, digits.rank = 12))
)

# ---- several groups, separate samples ----
y <- c(A, B, C, D)
g <- factor(rep(c("A", "B", "C", "D"), c(6, 6, 6, 4)))
fit <- aov(y ~ g)
tab <- summary(fit)[[1]]
tuk <- TukeyHSD(fit)$g
pooled <- pairwise.t.test(y, g, p.adjust.method = "none")$p.value
kw <- kruskal.test(y, g)
pw <- suppressWarnings(pairwise.wilcox.test(y, g))$p.value
pwRaw <- suppressWarnings(pairwise.wilcox.test(y, g, p.adjust.method = "none"))$p.value
# Dunnett's test, each group with the first: the chance that the largest of the t statistics
# (which share the control and the pooled spread) is at least the one seen. It is worked out here
# as the integral Dunnett wrote down, to many digits; multcomp's glht gives the same p values with
# the error of its simulation (compare: summary(glht(fit, linfct = mcp(g = "Dunnett")))).
dunnett_p <- function(groups) {
  yy <- unlist(groups); gg <- factor(rep(seq_along(groups), sapply(groups, length)))
  a <- aov(yy ~ gg); df <- a$df.residual; ms <- sum(resid(a)^2) / df
  n <- sapply(groups, length); m <- sapply(groups, mean)
  tt <- abs((m[-1] - m[1]) / sqrt(ms * (1 / n[-1] + 1 / n[1])))
  lam <- sqrt(n[-1] / (n[-1] + n[1]))
  within <- function(t, u) sapply(u, function(uu) integrate(function(z) sapply(z, function(zz) prod(pnorm((lam * zz + t * uu) / sqrt(1 - lam^2)) - pnorm((lam * zz - t * uu) / sqrt(1 - lam^2)))) * dnorm(z), -Inf, Inf, rel.tol = 1e-11)$value)
  sapply(tt, function(t) 1 - integrate(function(u) within(t, u) * 2 * df * u * dchisq(df * u^2, df), 0, Inf, rel.tol = 1e-10)$value)
}
# Pairs in the order A-B, A-C, A-D, B-C, B-D, C-D.
lower <- function(m) c(m["B", "A"], m["C", "A"], m["D", "A"], m["C", "B"], m["D", "B"], m["D", "C"])
several <- obj(
  anova = obj(statistic = num(tab[1, "F value"]), df = num(c(tab[1, "Df"], tab[2, "Df"])), p = num(tab[1, "Pr(>F)"])),
  tukey = num(tuk[c("B-A", "C-A", "D-A", "C-B", "D-B", "D-C"), "p adj"]),
  pooledRaw = num(lower(pooled)),
  # Each group against the first, corrected for three comparisons.
  pooledFirstHolm = num(p.adjust(lower(pooled)[1:3], "holm")),
  # Each group against the first by Dunnett's test (A-B, A-C, A-D).
  dunnettFirst = num(dunnett_p(list(A, B, C, D))),
  kruskal = htest(kw),
  wilcoxHolm = num(lower(pw)),
  wilcoxFirstHolm = num(p.adjust(lower(pwRaw)[1:3], "holm")),
  # Kruskal-Wallis with ties.
  kruskalTies = htest(kruskal.test(list(T1, T2, c(1, 1, 3, 5, 8))))
)

# ---- several groups, the same samples in every group ----
M <- cbind(A, B, C)
yy <- as.vector(M)
gg <- factor(rep(c("A", "B", "C"), each = 6))
ss <- factor(rep(1:6, 3))
rm <- anova(lm(yy ~ ss + gg))
ptt <- pairwise.t.test(yy, gg, paired = TRUE)$p.value
pww <- suppressWarnings(pairwise.wilcox.test(yy, gg, paired = TRUE, digits.rank = 12))$p.value
low3 <- function(m) c(m["B", "A"], m["C", "A"], m["C", "B"])
TM <- cbind(c(1, 2, 2, 3, 4), c(2, 2, 4, 4, 5), c(3, 2, 4, 6, 5))
repeated <- obj(
  anova = obj(statistic = num(rm["gg", "F value"]), df = num(c(rm["gg", "Df"], rm["Residuals", "Df"])), p = num(rm["gg", "Pr(>F)"])),
  pairedHolm = num(low3(ptt)),
  friedman = htest(friedman.test(M)),
  signedHolm = num(low3(pww)),
  friedmanTies = htest(friedman.test(TM))
)

# ---- does the scatter look normal? ----
resid4 <- residuals(fit)
normal <- obj(
  A = htest(shapiro.test(A)),
  S = htest(shapiro.test(S)),
  three = htest(shapiro.test(c(1.2, 3.4, 3.9))),
  T2 = htest(shapiro.test(T2)),
  residuals = htest(shapiro.test(resid4)),
  twelve = htest(shapiro.test(c(A, B))),
  large = htest(shapiro.test(qexp(ppoints(60))))
)

holm <- num(p.adjust(c(0.01, 0.04, 0.03, 0.5, 0.012), "holm"))

# ---- dose-response curves ----
# The four-parameter logistic along log10 of the dose: nls with the self-starting model SSfpl,
# y = A + (B - A) / (1 + exp((xmid - log10(x)) / scal)). BioSketch writes the same curve with
# hill = 1 / (scal * log(10)) and calls the higher plateau "top".
dose_fit <- function(x, y) {
  lx <- log10(x)
  f <- nls(y ~ SSfpl(lx, A, B, xmid, scal))
  co <- coef(f)
  se <- summary(f)$coefficients[, "Std. Error"]
  sse <- sum(residuals(f)^2)
  obj(x = num(x), y = num(y), A = num(co["A"]), B = num(co["B"]), xmid = num(co["xmid"]), scal = num(co["scal"]),
      seXmid = num(se["xmid"]), sse = num(sse), r2 = num(1 - sse / sum((y - mean(y))^2)), tcrit = num(qt(0.975, length(y) - 4)))
}
# A rising curve, one value per dose; a falling one (inhibition) with three values per dose; and
# a rising one with a shallow slope and plateaus that are only just reached.
doses <- c(0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100)
rise <- c(2.1, 3.4, 4.0, 11.8, 31.5, 62.0, 84.9, 93.1, 96.4)
dose3 <- rep(c(0.1, 0.3, 1, 3, 10, 30, 100, 300), each = 3)
fall <- c(101, 97, 99, 96, 99, 94, 88, 91, 85, 66, 71, 62, 38, 33, 41, 16, 19, 12, 8, 6, 9, 5, 7, 4)
shallow <- c(8.0, 12.5, 15.1, 24.9, 33.0, 45.2, 58.9, 66.8, 77.5)
# Plateaus held at a stated value: the same curve with fewer parameters to fit, written out for nls
# as y = bottom + (top - bottom) / (1 + 10^((m - log10 x) * s)).
held_out <- function(f, y) {
  co <- coef(f); se <- summary(f)$coefficients[, "Std. Error"]; sse <- sum(residuals(f)^2)
  obj(top = num(if ("top" %in% names(co)) co["top"] else NA), m = num(co["m"]), s = num(co["s"]), seM = num(se["m"]),
      sse = num(sse), r2 = num(1 - sse / sum((y - mean(y))^2)), tcrit = num(qt(0.975, df.residual(f))))
}
lx3 <- log10(dose3); lx1 <- log10(doses)
heldBoth <- nls(fall ~ 0 + (100 - 0) / (1 + 10^((m - lx3) * s)), start = list(m = 0.7, s = -1))
heldBottom <- nls(rise ~ 0 + (top - 0) / (1 + 10^((m - lx1) * s)), start = list(top = 95, m = 0.3, s = 1))
# Two inhibition curves: do they have the same IC50? Each fitted alone, then both with one middle.
fall2 <- c(99, 102, 98, 97, 99, 101, 93, 95, 96, 82, 85, 79, 58, 61, 55, 31, 28, 34, 14, 12, 16, 7, 6, 8)
both_y <- c(fall, fall2); both_lx <- c(lx3, lx3); g <- rep(c(0, 1), each = 24)
sep1 <- nls(fall ~ b + (t - b) / (1 + 10^((m - lx3) * s)), start = list(b = 4, t = 100, m = 0.7, s = -1))
sep2 <- nls(fall2 ~ b + (t - b) / (1 + 10^((m - lx3) * s)), start = list(b = 4, t = 100, m = 1.1, s = -1))
shared <- nls(both_y ~ (b1 * (1 - g) + b2 * g) + ((t1 * (1 - g) + t2 * g) - (b1 * (1 - g) + b2 * g)) / (1 + 10^((m - both_lx) * (s1 * (1 - g) + s2 * g))),
              start = list(b1 = 4, b2 = 5, t1 = 100, t2 = 100, s1 = -1, s2 = -1, m = 0.9))
rss <- function(f) sum(residuals(f)^2)
rss_sep <- rss(sep1) + rss(sep2); df_sep <- df.residual(sep1) + df.residual(sep2)
f_ec50 <- (rss(shared) - rss_sep) / (rss_sep / df_sep)
# The same question with both plateaus held at 0 and 100.
h1 <- nls(fall ~ 100 / (1 + 10^((m - lx3) * s)), start = list(m = 0.7, s = -1))
h2 <- nls(fall2 ~ 100 / (1 + 10^((m - lx3) * s)), start = list(m = 1.1, s = -1))
hs <- nls(both_y ~ 100 / (1 + 10^((m - both_lx) * (s1 * (1 - g) + s2 * g))), start = list(s1 = -1, s2 = -1, m = 0.9))
rss_h <- rss(h1) + rss(h2); df_h <- df.residual(h1) + df.residual(h2)
f_held <- (rss(hs) - rss_h) / (rss_h / df_h)
dose <- obj(rise = dose_fit(doses, rise), fall = dose_fit(dose3, fall), shallow = dose_fit(doses, shallow),
            qt = num(c(qt(0.975, 1), qt(0.975, 5), qt(0.975, 20), qt(0.995, 3), qt(0.95, 200))),
            heldBoth = held_out(heldBoth, fall), heldBottom = held_out(heldBottom, rise),
            fall2 = num(fall2),
            compare = obj(f = num(f_ec50), df = num(df_sep), p = num(pf(f_ec50, 1, df_sep, lower.tail = FALSE)), m1 = num(coef(sep1)["m"]), m2 = num(coef(sep2)["m"])),
            compareHeld = obj(f = num(f_held), df = num(df_h), p = num(pf(f_held, 1, df_h, lower.tail = FALSE))))

# ---- correlation ----
# Pearson, and Spearman with the exact p value (up to nine points, no ties) or the t approximation
# (exact = FALSE), which is what BioSketch uses for more points and for ties.
cx <- c(2.1, 3.4, 3.9, 4.4, 5.0, 5.6, 6.1, 7.3, 9.8, 14.2)
cy <- c(1.2, 2.9, 3.1, 4.8, 4.9, 6.4, 6.2, 8.1, 9.9, 15.1)
sx <- c(1.0, 2.5, 3.1, 4.8, 5.2, 6.9, 7.7, 9.0)
sy <- c(2.2, 1.9, 4.5, 3.8, 7.1, 6.0, 9.3, 8.8)
tx <- c(1, 2, 2, 3, 4, 5, 5, 6, 7, 8, 9, 9)
ty <- c(3, 1, 4, 4, 2, 6, 8, 5, 9, 7, 10, 12)
cor_out <- function(t) obj(r = num(t$estimate), p = num(t$p.value))
corr <- obj(
  x = num(cx), y = num(cy), sx = num(sx), sy = num(sy), tx = num(tx), ty = num(ty),
  pearson = cor_out(cor.test(cx, cy)),
  pearsonNoisy = cor_out(cor.test(sx, sy)),
  spearmanExact = cor_out(cor.test(sx, sy, method = "spearman")),
  spearmanExactFall = cor_out(cor.test(sx, -sy + c(0, 3, 0, 0, 0, 0, 0, 0), method = "spearman")),
  spearmanLarge = cor_out(cor.test(cx, cy + c(0, 0, 3, 0, 0, 2, 0, 0, 0, 0), method = "spearman", exact = FALSE)),
  spearmanTies = cor_out(suppressWarnings(cor.test(tx, ty, method = "spearman", exact = FALSE)))
)

# ---- survival ----
# Kaplan-Meier estimates (survfit) and the log-rank test (survdiff) of the survival package.
suppressMessages(library(survival))
km_out <- function(time, status) {
  f <- survfit(Surv(time, status) ~ 1)
  obj(time = num(time), status = num(status), at = num(f$time), surv = num(f$surv), atRisk = num(f$n.risk), median = num(unname(summary(f)$table["median"])))
}
lr_out <- function(time, status, group) {
  d <- survdiff(Surv(time, status) ~ group)
  obj(chisq = num(d$chisq), df = num(length(d$n) - 1), p = num(pchisq(d$chisq, length(d$n) - 1, lower.tail = FALSE)), observed = num(d$obs), expected = num(d$exp))
}
# Three groups of mice: days until the event (1) or until the mouse left the study without it (0).
ta <- c(6, 7, 10, 15, 19, 25, 30, 34, 40, 40); sa <- c(1, 1, 1, 1, 0, 1, 1, 0, 0, 0)
tb <- c(4, 5, 5, 8, 9, 12, 13, 17, 21, 28);   sb <- c(1, 1, 1, 1, 1, 1, 0, 1, 1, 1)
tc <- c(9, 14, 18, 22, 26, 33, 40, 40, 40, 40); sc <- c(1, 0, 1, 1, 0, 1, 0, 0, 0, 0)
# The estimate is exactly one half between two events: the median is the middle of that stretch.
th <- c(2, 4, 6, 8); sh <- c(1, 1, 1, 1)
surv <- obj(
  a = km_out(ta, sa), b = km_out(tb, sb), c = km_out(tc, sc), half = km_out(th, sh),
  ab = lr_out(c(ta, tb), c(sa, sb), rep(c("a", "b"), each = 10)),
  abc = lr_out(c(ta, tb, tc), c(sa, sb, sc), rep(c("a", "b", "c"), each = 10)),
  ac = lr_out(c(ta, tc), c(sa, sc), rep(c("a", "c"), each = 10)),
  bc = lr_out(c(tb, tc), c(sb, sc), rep(c("b", "c"), each = 10))
)

# ---- two factors ----
# Two-way analysis of variance with Type II sums of squares: each factor after the other, the
# interaction after both, every F against what is left within the combinations. Worked out from
# least-squares fits (lm). With equal numbers in every combination it must equal anova(aov(y ~ A * B)),
# which is recorded beside it. Pairs: t tests with the scatter left over in the whole table, Holm.
type2 <- function(y, A, B) {
  rss <- function(m) sum(residuals(m)^2)
  full <- lm(y ~ A * B); both <- lm(y ~ A + B)
  dfe <- df.residual(full); mse <- rss(full) / dfe
  ss <- c(rss(lm(y ~ B)) - rss(both), rss(lm(y ~ A)) - rss(both), rss(both) - rss(full))
  df <- c(nlevels(A) - 1, nlevels(B) - 1, (nlevels(A) - 1) * (nlevels(B) - 1))
  f <- ss / df / mse
  list(ss = ss, df = df, f = f, p = pf(f, df, dfe, lower.tail = FALSE), dfe = dfe, mse = mse)
}
cell_pair <- function(x, y, fit) 2 * pt(-abs((mean(x) - mean(y)) / sqrt(fit$mse * (1 / length(x) + 1 / length(y)))), fit$dfe)
two_out <- function(fit, extra = list()) do.call(obj, c(list(ss = num(fit$ss), df = num(fit$df), f = num(fit$f), p = num(fit$p), dfe = num(fit$dfe), mse = num(fit$mse)), extra))
# Three categories by two series, four values each (balanced).
bal <- list(c(4.1, 3.8, 4.6, 4.3), c(6.9, 7.4, 6.1, 7.8), c(5.0, 4.7, 5.6, 5.2), c(9.4, 8.8, 10.1, 9.0), c(4.4, 4.9, 3.9, 4.6), c(5.1, 5.9, 4.8, 5.5))
balA <- factor(rep(c("c1", "c2", "c3"), each = 8)); balB <- factor(rep(rep(c("s1", "s2"), each = 4), 3))
balFit <- type2(unlist(bal), balA, balB)
balAov <- anova(aov(unlist(bal) ~ balA * balB))
balPairs <- p.adjust(c(cell_pair(bal[[1]], bal[[2]], balFit), cell_pair(bal[[3]], bal[[4]], balFit), cell_pair(bal[[5]], bal[[6]], balFit)), "holm")
balAcross <- p.adjust(c(cell_pair(bal[[1]], bal[[3]], balFit), cell_pair(bal[[1]], bal[[5]], balFit), cell_pair(bal[[3]], bal[[5]], balFit),
                        cell_pair(bal[[2]], bal[[4]], balFit), cell_pair(bal[[2]], bal[[6]], balFit), cell_pair(bal[[4]], bal[[6]], balFit)), "holm")
# Two by two with unequal numbers: A, B, D and C from the top of this file (6, 6, 4 and 6 values).
unA <- factor(c(rep("c1", 12), rep("c2", 10))); unB <- factor(c(rep("s1", 6), rep("s2", 6), rep("s1", 4), rep("s2", 6)))
unFit <- type2(c(A, B, D, C), unA, unB)
unPairs <- p.adjust(c(cell_pair(A, B, unFit), cell_pair(D, C, unFit)), "holm")
twoway <- obj(
  balanced = two_out(balFit, list(aovF = num(balAov[1:3, "F value"]), aovP = num(balAov[1:3, "Pr(>F)"]), within = num(balPairs), across = num(balAcross))),
  unequal = two_out(unFit, list(within = num(unPairs)))
)

# ---- standard curves ----
# Standards of known concentration give a curve, unknown samples are read off it (src/model/standardCurve.ts).
# Every replicate value is a point of the fit, unweighted least squares. Straight line and
# quadratic: lm(y ~ x) and lm(y ~ x + I(x^2)). Four- and five-parameter logistic: drc's LL.4 and
# LL.5, f(x) = c + (d - c) / (1 + exp(b (log x - log e)))^f, which BioSketch writes as
# bottom + (top - bottom) / (1 + (ec50 / x)^hill)^asym with bottom = c, top = d, ec50 = e,
# hill = -b, asym = f (LL.4: f = 1). Standards at concentration 0 take part (the curve is c there
# when b < 0). The concentration of a signal is found on R's fitted curve with uniroot.
# All the numbers below are made up, shaped like real plates.
suppressMessages(library(drc))
std_lm <- function(x, y, quad, signals) {
  f <- if (quad) lm(y ~ x + I(x^2)) else lm(y ~ x)
  co <- unname(coef(f)); if (!quad) co <- c(co, 0)
  p <- function(v) co[1] + co[2] * v + co[3] * v^2
  hi <- max(x); up <- 1.5 * hi
  rising <- p(hi) > p(min(x[x > 0]))
  # Only the part of the parabola that runs the way the standards do, between 0 and 1.5 times the highest standard.
  if (quad && co[3] != 0) { v <- -co[2] / (2 * co[3]); if ((co[3] < 0) == rising && v > 0) up <- min(up, v) else if (v > 0 && v < up) stop("standards on both sides of the vertex") }
  inv <- sapply(signals, function(s) if (quad) { if (sign(p(0) - s) == sign(p(up) - s)) NA else uniroot(function(v) p(v) - s, c(0, up), tol = 1e-13)$root } else { r <- (s - co[1]) / co[2]; if (r < 0) NA else r })
  sse <- sum(residuals(f)^2)
  obj(x = num(x), y = num(y), coef = num(if (quad) co else co[1:2]), sse = num(sse), sy = num(summary(f)$sigma), df = num(df.residual(f)),
      r2 = num(summary(f)$r.squared), fitted = num(fitted(f)), signals = num(signals), conc = num(inv))
}
# drm's optimiser (BFGS) stops a little short of the least-squares solution on these curves, even
# with relTol = 1e-14: it is started again from its own answer until the misfit stops falling, and
# that answer is then polished by nls (Gauss-Newton) on the same formula. Both are recorded: the
# polished one, with a smaller misfit, is the one BioSketch is held to closely.
ll5 <- function(x, b, c, d, e, f) c + (d - c) / (1 + exp(b * (log(x) - log(e))))^f
std_ll <- function(x, y, five, signals) {
  fct <- if (five) LL.5() else LL.4()
  f <- drm(y ~ x, fct = fct, control = drmc(relTol = 1e-14, maxIt = 10000)); s <- sum(residuals(f)^2)
  for (k in 1:200) {
    g <- drm(y ~ x, fct = fct, start = coef(f), control = drmc(relTol = 1e-15, maxIt = 10000)); t <- sum(residuals(g)^2)
    f <- g; if (s - t <= 1e-15 * s) break; s <- t
  }
  dco <- unname(coef(f)); if (!five) dco <- c(dco, 1)
  st <- list(b = dco[1], c = dco[2], d = dco[3], e = dco[4])
  ctl <- nls.control(tol = 1e-7, maxiter = 1000, minFactor = 1e-12, scaleOffset = 1)
  n <- if (five) nls(y ~ ll5(x, b, c, d, e, f), start = c(st, f = dco[5]), control = ctl) else nls(y ~ ll5(x, b, c, d, e, 1), start = st, control = ctl)
  co <- unname(coef(n)); if (!five) co <- c(co, 1)
  sse <- sum(residuals(n)^2)
  if (sse > sum(residuals(f)^2) || max(abs(co / dco - 1)) > 1e-3) stop("nls did not polish drm's answer")
  curve <- function(v) ll5(v, co[1], co[2], co[3], co[4], co[5])
  inv <- sapply(signals, function(s) {
    g <- function(lv) curve(exp(lv)) - s
    if (sign(g(log(1e-9))) == sign(g(log(1e9)))) NA else exp(uniroot(g, log(c(1e-9, 1e9)), tol = 1e-14)$root)
  })
  df <- length(y) - (if (five) 5 else 4)
  obj(x = num(x), y = num(y), b = num(co[1]), c = num(co[2]), d = num(co[3]), e = num(co[4]), f = num(co[5]),
      drm = num(dco), drmSse = num(sum(residuals(f)^2)),
      sse = num(sse), df = num(df), sy = num(sqrt(sse / df)), r2 = num(1 - sse / sum((y - mean(y))^2)),
      fitted = num(curve(x)), signals = num(signals), conc = num(inv))
}
# BCA assay, absorbance at 562 nm, eight albumin standards in µg/mL, in duplicate.
bcaX <- rep(c(0, 25, 125, 250, 500, 1000, 1500, 2000), each = 2)
bcaY <- c(0.095, 0.101, 0.121, 0.126, 0.218, 0.211, 0.329, 0.338, 0.547, 0.536, 0.921, 0.934, 1.243, 1.229, 1.502, 1.518)
bcaS <- c(0.08, 0.40, 0.85, 1.10, 1.60)
bcaBlank <- bcaY - mean(bcaY[bcaX == 0])
# Sandwich ELISA, absorbance at 450 nm, eight standards in pg/mL, in triplicate: a rising curve.
elX <- rep(c(0, 15.6, 31.25, 62.5, 125, 250, 500, 1000), each = 3)
elY <- c(0.052, 0.049, 0.055, 0.363, 0.365, 0.364, 0.510, 0.524, 0.541, 0.803, 0.791, 0.778,
         1.171, 1.164, 1.162, 1.699, 1.739, 1.694, 2.298, 2.281, 2.367, 2.769, 2.835, 2.832)
elS <- c(0.03, 0.20, 1.00, 2.50, 3.50)
# Competitive ELISA, eight standards in ng/mL, in duplicate: the signal falls as the concentration rises.
coX <- rep(c(0, 1.56, 3.12, 6.25, 12.5, 25, 50, 100), each = 2)
coY <- c(1.856, 1.902, 1.617, 1.630, 1.455, 1.512, 1.181, 1.173, 0.791, 0.838, 0.547, 0.530, 0.349, 0.349, 0.238, 0.239)
coS <- c(1.95, 1.70, 1.00, 0.40, 0.20, 0.10)
standard <- obj(
  bcaLinear = std_lm(bcaX, bcaY, FALSE, bcaS), bcaQuadratic = std_lm(bcaX, bcaY, TRUE, bcaS),
  bcaBlankLinear = std_lm(bcaX, bcaBlank, FALSE, bcaS - mean(bcaY[bcaX == 0])),
  elisa4 = std_ll(elX, elY, FALSE, elS), elisa5 = std_ll(elX, elY, TRUE, elS), competitive4 = std_ll(coX, coY, FALSE, coS)
)

# ---- enzyme kinetics ----
# Initial rates against substrate concentration (src/model/kinetics.ts). Every replicate rate is a
# point of the fit, unweighted least squares, by nls on the formulas below (the ones GraphPad Prism
# fits under the same names). Inhibition models are fitted over all series at once, one row per
# rate in a long table (S, I, v), with Vmax, Km, Ki (and alpha) shared by every series:
#   Michaelis-Menten  v = Vmax S / (Km + S)
#   competitive       v = Vmax S / (Km (1 + I/Ki) + S)
#   uncompetitive     v = Vmax S / (Km + S (1 + I/Ki))
#   noncompetitive    v = Vmax S / ((Km + S) (1 + I/Ki))          (pure: alpha = 1)
#   mixed             v = Vmax S / (Km (1 + I/Ki) + S (1 + I/(alpha Ki)))
# Standard errors are those of summary(nls); the 95 % intervals are estimate -/+ qt(0.975, df) SE
# (the asymptotic Wald interval of confint.default, with t in place of z). AIC is R's AIC(), from the
# full Gaussian likelihood; aicc is GraphPad's n log(sse/n) + 2K + 2K(K+1)/(n-K-1), K = parameters + 1.
# Each fit is started from the answer of a first nls and run again with a tight tolerance, so that
# it ends at the least-squares solution to many digits; the first answer's misfit is kept beside it.
# The F tests are anova(smaller, mixed): the three simpler models are mixed with alpha held (1) or
# taken to a limit (infinite: competitive; 0 with alpha Ki held: uncompetitive), one degree of freedom.
# kcat = Vmax / [E]; the standard error of kcat / Km is the delta method on vcov(nls).
# The rates are made up (noise of a few per cent on curves of known parameters), rounded as read.
kin_formula <- list(
  mm = v ~ Vmax * S / (Km + S),
  competitive = v ~ Vmax * S / (Km * (1 + I / Ki) + S),
  uncompetitive = v ~ Vmax * S / (Km + S * (1 + I / Ki)),
  noncompetitive = v ~ Vmax * S / ((Km + S) * (1 + I / Ki)),
  mixed = v ~ Vmax * S / (Km * (1 + I / Ki) + S * (1 + I / (alpha * Ki)))
)
kin_nls <- function(model, data, start) {
  first <- nls(kin_formula[[model]], data = data, start = start)
  # A tolerance below what the arithmetic can reach: nls stops at its floor (warnOnly) and the
  # answer is taken when its relative offset is within 1e-6 (about 4e-8 for the poorly determined set b, 1e-9 for the others).
  f <- suppressWarnings(nls(kin_formula[[model]], data = data, start = as.list(coef(first)),
                            control = nls.control(tol = 1e-11, maxiter = 200, minFactor = 1e-12, warnOnly = TRUE)))
  if (sum(residuals(f)^2) > sum(residuals(first)^2) || f$convInfo$finTol > 1e-6) stop("the tight nls did not improve on the first")
  list(fit = f, firstSse = sum(residuals(first)^2))
}
kin_out <- function(k, data, at, enzyme = NA) {
  f <- k$fit
  co <- coef(f); se <- summary(f)$coefficients[, "Std. Error"]; v <- vcov(f)
  n <- nrow(data); p <- length(co); df <- n - p; sse <- sum(residuals(f)^2); K <- p + 1
  tq <- qt(0.975, df)
  out <- list(names = paste0("[", paste(sprintf("\"%s\"", names(co)), collapse = ","), "]"),
              coef = num(co), se = num(se), lo = num(co - tq * se), hi = num(co + tq * se),
              vcov = paste0("[", paste(apply(v, 1, num), collapse = ","), "]"),
              n = num(n), df = num(df), sse = num(sse), firstSse = num(k$firstSse), sigma = num(summary(f)$sigma),
              r2 = num(1 - sse / sum((data$v - mean(data$v))^2)), aic = num(AIC(f)),
              aicc = num(n * log(sse / n) + 2 * K + 2 * K * (K + 1) / (n - K - 1)),
              atS = num(at$S), atI = num(at$I), fitted = num(predict(f, newdata = at)))
  if (!is.na(enzyme)) {
    g <- c(1 / (enzyme * co["Km"]), -co["Vmax"] / (enzyme * co["Km"]^2))
    out <- c(out, list(enzyme = num(enzyme), kcat = num(co["Vmax"] / enzyme), kcatSe = num(se["Vmax"] / enzyme),
                       kcatKm = num(co["Vmax"] / (enzyme * co["Km"])), kcatKmSe = num(sqrt(drop(t(g) %*% v[c("Vmax", "Km"), c("Vmax", "Km")] %*% g)))))
  }
  do.call(obj, out)
}
# (a) Eight substrate concentrations from 0 to 200 µM in triplicate, Km about 25 µM, Vmax about 120.
mmA <- data.frame(S = rep(c(0, 2.5, 5, 10, 25, 50, 100, 200), each = 3),
                  v = c(0.5, 0.1, 0.3, 11, 10.2, 10.5, 20.1, 20.2, 20.1, 36.5, 34.5, 36.9, 64.5, 60.1, 63.4, 81.2, 78.3, 79, 95.9, 98.3, 98.3, 108.8, 111.4, 102.5))
mmA$I <- 0
# (b) Substrate only up to half of Km (about 44 µM): Km is poorly determined, but finite.
mmB <- data.frame(S = rep(c(1, 2, 4, 6, 8, 12, 16, 20), each = 2),
                  v = c(1.96, 2.01, 3.78, 3.81, 7.35, 7.65, 10.66, 10.59, 12.71, 13.46, 18.55, 17.96, 22.91, 22.97, 27.1, 27.23))
mmB$I <- 0
# (c) Four inhibitor concentrations (0, 5, 10, 20 µM) by seven substrate concentrations, in duplicate,
# from mixed inhibition (Vmax 100, Km 20, Ki 4, alpha 3) with noise of 8 %.
inh <- data.frame(S = rep(rep(c(2.5, 5, 10, 20, 40, 80, 160), each = 2), 4), I = rep(c(0, 5, 10, 20), each = 14),
                  v = c(11.8, 10.6, 18.7, 21.1, 38.4, 33.4, 46.2, 41.6, 60.7, 68.5, 74.3, 91.1, 101.3, 79.5,
                        4.7, 5.3, 10.5, 9.4, 15.7, 17.2, 25.5, 24.2, 37.6, 37.8, 47.6, 53.5, 66.4, 56.7,
                        3.3, 3.2, 6.4, 6.7, 10.8, 10.9, 20.2, 18.1, 29.2, 30.9, 42.7, 32.6, 46.1, 40.2,
                        2.1, 1.8, 3.2, 3.8, 6.9, 7, 11.3, 11.4, 17.8, 17.6, 23.9, 21.5, 27.4, 28.1))
atMM <- data.frame(S = c(0, 7, 30, 150), I = 0)
atInh <- data.frame(S = c(10, 10, 50, 160), I = c(0, 7.5, 20, 5))
kA <- kin_nls("mm", mmA, list(Vmax = 100, Km = 20))
kB <- kin_nls("mm", mmB, list(Vmax = 50, Km = 20))
st3 <- list(Vmax = 100, Km = 20, Ki = 4)
kInh <- list(competitive = kin_nls("competitive", inh, st3), uncompetitive = kin_nls("uncompetitive", inh, st3),
             noncompetitive = kin_nls("noncompetitive", inh, st3), mixed = kin_nls("mixed", inh, c(st3, alpha = 3)))
kin_f <- function(smaller) {
  a <- anova(kInh[[smaller]]$fit, kInh$mixed$fit)
  obj(f = num(a[2, "F value"]), df1 = num(a[2, "Df"]), df2 = num(a[2, "Res.Df"]), p = num(a[2, "Pr(>F)"]))
}
aiccs <- sapply(names(kInh), function(m) { f <- kInh[[m]]$fit; n <- nrow(inh); K <- length(coef(f)) + 1; sse <- sum(residuals(f)^2); n * log(sse / n) + 2 * K + 2 * K * (K + 1) / (n - K - 1) })
kinetics <- obj(
  mmA = kin_out(kA, mmA, atMM, enzyme = 0.05), mmB = kin_out(kB, mmB, atMM, enzyme = 0.05),
  inhS = num(inh$S), inhI = num(inh$I), inhV = num(inh$v), mmAS = num(mmA$S), mmAV = num(mmA$v), mmBS = num(mmB$S), mmBV = num(mmB$v),
  competitive = kin_out(kInh$competitive, inh, atInh), uncompetitive = kin_out(kInh$uncompetitive, inh, atInh),
  noncompetitive = kin_out(kInh$noncompetitive, inh, atInh), mixed = kin_out(kInh$mixed, inh, atInh),
  fCompetitive = kin_f("competitive"), fUncompetitive = kin_f("uncompetitive"), fNoncompetitive = kin_f("noncompetitive"),
  best = sprintf("\"%s\"", names(which.min(aiccs)))
)


# ---- qPCR ----
# Relative expression by ΔΔCt (src/model/qpcr.ts), worked out here step by step: technical replicates
# averaged, ΔCt against the mean of the reference genes (Cq multiplied by log2 of the amplification
# factor when an efficiency is given), ΔΔCt against the mean ΔCt of the control, the error as the SD
# (or SEM) of ΔCt over biological replicates or, for a condition of one sample, √(s_target² + s_ref²)
# from the technical replicates (ABI User Bulletin #2), Welch's t test on ΔCt with Holm's correction.
strs <- function(v) paste0("[", paste(sprintf("\"%s\"", v), collapse = ","), "]")
arr <- function(v) { v <- unname(v); paste0("[", paste(ifelse(is.na(v), "null", sprintf("%.15g", v)), collapse = ","), "]") }
qpcr_run <- function(sample, target, cq, ref, control, eff = list(), sem = FALSE, paired = FALSE) {
  cond_of <- function(s) sub(" +[0-9]+$", "", s)
  f <- function(t) log2(1 + (if (is.null(eff[[t]])) 100 else eff[[t]]) / 100)
  q <- cq * sapply(target, f)
  err1 <- function(v) if (length(v) < 2) NA else if (sem) sd(v) / sqrt(length(v)) else sd(v)
  samples <- unique(sample)
  refv <- sapply(samples, function(s) mean(sapply(ref, function(r) mean(q[sample == s & target == r]))))
  refe <- sapply(samples, function(s) sqrt(sum(sapply(ref, function(r) err1(q[sample == s & target == r])^2))) / length(ref))
  cs <- cond_of(samples)
  conds <- c(control, setdiff(unique(cs), control))
  genes <- list()
  for (t in setdiff(unique(target), ref)) {
    dct <- sapply(samples, function(s) mean(q[sample == s & target == t]) - refv[[s]])
    tech <- sapply(samples, function(s) sqrt(err1(q[sample == s & target == t])^2 + refe[[s]]^2))
    base <- mean(dct[cs == control])
    r <- sapply(conds, function(c) {
      d <- unname(dct[cs == c])
      e <- unname(if (length(d) >= 2) err1(d) else tech[cs == c][1])
      ddct <- mean(d) - base
      # Paired: each sample against the control of the same number ("LPS 2" with "Control 2").
      pair_of <- function(s) sub("^.* +([0-9]+)$", "\\1", s)
      p <- if (c == control || length(d) < 2) NA else if (paired) {
        ctl <- dct[cs == control]; names(ctl) <- pair_of(names(ctl))
        mine <- dct[cs == c]; names(mine) <- pair_of(names(mine))
        both <- intersect(names(mine), names(ctl))
        t.test(mine[both], ctl[both], paired = TRUE)$p.value
      } else t.test(d, dct[cs == control])$p.value
      c(dct = mean(d), ddct = ddct, err = e, fold = 2^-ddct, low = 2^-(ddct + e), high = 2^-(ddct - e), p = p)
    })
    adj <- rep(NA, length(conds)); ok <- !is.na(r["p", ]); adj[ok] <- p.adjust(r["p", ok], "holm")
    genes[[t]] <- obj(dct = arr(r["dct", ]), ddct = arr(r["ddct", ]), err = arr(r["err", ]), fold = arr(r["fold", ]), low = arr(r["low", ]), high = arr(r["high", ]), p = arr(r["p", ]), adjusted = arr(adj))
  }
  obj(sample = strs(sample), target = strs(target), cq = arr(cq), conditions = strs(conds), genes = do.call(obj, genes))
}
# (a) Three conditions of three biological replicates (mice, cultures), technical triplicates, GAPDH as reference.
qA_cq <- c(18.14, 18.09, 18.15, 28.32, 28.26, 28.31, 25.96, 25.98, 25.96, 18.04, 17.86, 17.86, 28.24, 28.28, 28.34, 26.12, 26.17, 26.08, 18.37, 18.28, 18.33, 28.15, 28.14, 28.17, 25.83, 25.89, 25.85, 18.34, 18.18, 18.27, 23.39, 23.24, 23.36, 24.47, 24.21, 24.34, 18.28, 18.17, 18.35, 23.45, 23.47, 23.51, 24.65, 24.63, 24.52, 18.27, 18.3, 18.33, 23.55, 23.28, 23.33, 24.41, 24.5, 24.43, 17.81, 17.78, 17.95, 25.66, 25.58, 25.59, 25.32, 25.42, 25.34, 18.26, 18.24, 18.2, 26.18, 26.29, 26.4, 24.66, 24.79, 24.89, 17.93, 17.97, 17.99, 26.61, 26.69, 26.55, 25.3, 25.42, 25.34)
qA_sample <- rep(paste(rep(c("Control", "LPS", "LPS + drug"), each = 3), 1:3), each = 9)
qA_target <- rep(rep(c("GAPDH", "IL6", "TNF"), each = 3), 9)
# (b) One sample per condition: the error comes from the technical replicates.
qB_sample <- rep(c("Control", "Treated"), each = 6)
qB_target <- rep(rep(c("GAPDH", "IL6"), each = 3), 2)
qB_cq <- c(18.10, 18.22, 18.16, 27.40, 27.61, 27.52, 18.31, 18.25, 18.40, 25.02, 25.20, 24.94)
qpcr <- obj(
  bio = qpcr_run(qA_sample, qA_target, qA_cq, "GAPDH", "Control"),
  tech = qpcr_run(qB_sample, qB_target, qB_cq, "GAPDH", "Control"),
  # (c) Two reference genes, an efficiency of 92 % for IL6, and the SEM.
  refsEff = qpcr_run(qA_sample, qA_target, qA_cq, c("GAPDH", "TNF"), "Control", eff = list(IL6 = 92), sem = TRUE),
  # (d) The samples of (a) as pairs: Control 1 with LPS 1, and so on (cultures of one donor each).
  paired = qpcr_run(qA_sample, qA_target, qA_cq, "GAPDH", "Control", paired = TRUE),
  # (e) Efficiency from a dilution series: Cq against log10 of the amount, by lm (src/model/qpcrEfficiency.ts).
  dilution = local({
    q <- rep(10^(0:-4), each = 3)
    cqs <- list(
      GAPDH = c(15.02, 15.11, 14.95, 18.38, 18.29, 18.41, 21.70, 21.66, 21.79, 25.04, 24.98, 25.12, 28.41, 28.30, 28.52),
      IL6 = c(20.10, 20.21, 20.05, 23.62, 23.70, 23.55, 27.21, 27.08, 27.30, 30.79, 30.66, 30.85, 34.40, 34.18, 34.52)
    )
    fits <- lapply(names(cqs), function(t) {
      f <- lm(cqs[[t]] ~ log10(q)); ci <- confint(f)[2, ]; e <- function(s) (10^(-1 / s) - 1) * 100
      obj(slope = sprintf("%.15g", coef(f)[2]), intercept = sprintf("%.15g", coef(f)[1]), r2 = sprintf("%.15g", summary(f)$r.squared),
          efficiency = sprintf("%.15g", e(coef(f)[2])), lo = sprintf("%.15g", e(ci[1])), hi = sprintf("%.15g", e(ci[2])))
    })
    names(fits) <- names(cqs)
    obj(q = arr(q), GAPDH = arr(cqs$GAPDH), IL6 = arr(cqs$IL6), fits = do.call(obj, fits))
  })
)


# ---- saturation binding ----
# Bound ligand against the free concentration (src/model/binding.ts), every replicate a point of an
# unweighted nls, polished with a tight tolerance as the kinetics fits are:
#   one site          B = Bmax x / (Kd + x)
#   Hill slope        B = Bmax x^h / (Kd^h + x^h); anova(one site, Hill) for the F test of h = 1
#   total + nonspec.  B = t Bmax x / (Kd + x) + NS x + Bkg, t = 1 for total, 0 for nonspecific
# The values are made up (set.seed, noise of a few per cent), rounded as read.
tight <- function(formula, data, start) {
  first <- nls(formula, data = data, start = start)
  f <- suppressWarnings(nls(formula, data = data, start = as.list(coef(first)),
                            control = nls.control(tol = 1e-11, maxiter = 200, minFactor = 1e-12, warnOnly = TRUE)))
  if (sum(residuals(f)^2) > sum(residuals(first)^2) * (1 + 1e-12)) stop("the tight nls did not improve on the first")
  f
}
nls_out <- function(f, data, y) {
  co <- coef(f); se <- summary(f)$coefficients[, "Std. Error"]
  n <- nrow(data); df <- n - length(co); sse <- sum(residuals(f)^2); tq <- qt(0.975, df)
  obj(names = paste0("[", paste(sprintf("\"%s\"", names(co)), collapse = ","), "]"),
      coef = num(co), se = num(se), lo = num(co - tq * se), hi = num(co + tq * se),
      n = num(n), df = num(df), sse = num(sse), sigma = num(summary(f)$sigma), r2 = num(1 - sse / sum((y - mean(y))^2)))
}
set.seed(11)
bx <- rep(c(0.1, 0.25, 0.5, 1, 2, 4, 8, 16), each = 3)
bOne <- data.frame(x = bx, y = round(1500 * bx / (1.2 + bx) * (1 + rnorm(24, 0, 0.04)), 1))
hx <- rep(c(0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 10), each = 2)
bHill <- data.frame(x = hx, y = round(100 * hx^1.8 / (2^1.8 + hx^1.8) + rnorm(18, 0, 2), 2))
tx <- rep(c(0.2, 0.5, 1, 2, 4, 8, 12, 20), each = 2)
bTot <- data.frame(x = c(tx, tx), t = rep(c(1, 0), each = 16))
bTot$y <- round(bTot$t * 1500 * bTot$x / (1.2 + bTot$x) + 40 * bTot$x + 20 + rnorm(32, 0, 25), 1)
fOne <- tight(y ~ Bmax * x / (Kd + x), bOne, list(Bmax = 1500, Kd = 1))
fHill <- tight(y ~ Bmax * x^h / (Kd^h + x^h), bHill, list(Bmax = 100, Kd = 2, h = 1.5))
fHill1 <- tight(y ~ Bmax * x / (Kd + x), bHill, list(Bmax = 100, Kd = 2))
aH <- anova(fHill1, fHill)
fTot <- tight(y ~ t * Bmax * x / (Kd + x) + NS * x + Bkg, bTot, list(Bmax = 1500, Kd = 1, NS = 40, Bkg = 20))
binding <- obj(
  oneX = num(bOne$x), oneY = num(bOne$y), one = nls_out(fOne, bOne, bOne$y),
  hillX = num(bHill$x), hillY = num(bHill$y), hill = nls_out(fHill, bHill, bHill$y),
  hillF = obj(f = num(aH[2, "F value"]), df1 = num(aH[2, "Df"]), df2 = num(aH[2, "Res.Df"]), p = num(aH[2, "Pr(>F)"])),
  totX = num(tx), totY = num(bTot$y[bTot$t == 1]), nsY = num(bTot$y[bTot$t == 0]), total = nls_out(fTot, bTot, bTot$y)
)

# ---- melting curves ----
# A signal against temperature (src/model/melt.ts). The mean signal at each temperature; its rate of
# change at each temperature is the slope of lm() through that reading and the three on either side;
# the steepest is the largest in size, and the derivative Tm is the top of the parabola through it
# and its two neighbours. The transition runs from the steepest change back to the lowest reading
# before it and on to the highest after it (mirrored for a falling signal). The Boltzmann curve
# y = bottom + (top - bottom) / (1 + exp((Tm - T) / slope)) is fitted by nls to the readings in it.
# Tm of replicate curves are compared between conditions by t.test (Welch). The readings are made
# up: a thermal shift assay whose signal falls after its peak (clumping), and a falling CD signal.
melt_one <- function(tt, y) {
  m <- aggregate(y, list(t = tt), mean); m <- m[order(m$t), ]; p <- m$t; py <- m$x
  idx <- 4:(length(p) - 3)
  d <- sapply(idx, function(i) coef(lm(py[(i - 3):(i + 3)] ~ p[(i - 3):(i + 3)]))[2])
  k <- which.max(abs(d)); dir <- sign(d[k]); i <- idx[k]
  tv <- p[idx[(k - 1):(k + 1)]]; dv <- dir * d[(k - 1):(k + 1)]
  q <- lm(dv ~ tv + I(tv^2)); tmD <- -coef(q)[2] / (2 * coef(q)[3])
  lo <- which.min(dir * py[1:i]); hi <- i - 1 + which.max(dir * py[i:length(py)])
  win <- c(p[lo], p[hi])
  dat <- data.frame(T = tt, y = y)[tt >= win[1] & tt <= win[2], ]
  f <- tight(y ~ b + (tp - b) / (1 + exp((tm - T) / s)), dat, list(b = py[lo], tp = py[hi], tm = tmD, s = (win[2] - win[1]) / 8))
  list(out = obj(window = num(win), tmDerivative = num(tmD), direction = num(dir), fit = nls_out(f, dat, dat$y)), tm = coef(f)["tm"])
}
set.seed(5)
mt <- seq(25, 95, by = 0.5)
dsf <- function(tm) {
  base <- 1000 + 9000 / (1 + exp((tm - mt) / 1.8))
  round(base * ifelse(mt > tm + 10, exp(-(mt - tm - 10) * 0.06), 1) + rnorm(length(mt), 0, 40))
}
curves <- list(apo1 = dsf(52), apo2 = dsf(52.3), drug1 = dsf(56.4), drug2 = dsf(56.1))
cdT <- seq(20, 90, by = 1)
cd <- round(-20 + 18 / (1 + exp((cdT - 64) / 3)) + rnorm(length(cdT), 0, 0.3), 2)
mfits <- lapply(curves, function(y) melt_one(mt, y))
mcd <- melt_one(cdT, cd)
tmA <- c(mfits$apo1$tm, mfits$apo2$tm); tmB <- c(mfits$drug1$tm, mfits$drug2$tm)
meltRef <- obj(
  t = num(mt), apo1 = num(curves$apo1), apo2 = num(curves$apo2), drug1 = num(curves$drug1), drug2 = num(curves$drug2),
  fits = obj(apo1 = mfits$apo1$out, apo2 = mfits$apo2$out, drug1 = mfits$drug1$out, drug2 = mfits$drug2$out),
  cdT = num(cdT), cd = num(cd), cdFit = mcd$out,
  delta = num(mean(tmB) - mean(tmA)), welch = htest(t.test(tmB, tmA))
)

writeLines(obj(r = sprintf("\"%s\"", R.version.string), dist = dist, two = two, several = several, repeated = repeated, normal = normal, holm = holm, dose = dose, twoway = twoway, corr = corr, surv = surv, standard = standard, kinetics = kinetics, qpcr = qpcr, binding = binding, melt = meltRef), "tests/stats-reference.json")
cat("Wrote tests/stats-reference.json\n")
