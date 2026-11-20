# Reference values for BioSketch's statistical tests, worked out in R (base and stats only).
# Run from the project folder:   Rscript scripts/stats-reference.R
# It writes tests/stats-reference.json, which tests/distributions.test.ts and
# tests/chart-tests.test.ts compare BioSketch's own arithmetic with.

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

writeLines(obj(r = sprintf("\"%s\"", R.version.string), dist = dist, two = two, several = several, repeated = repeated, normal = normal, holm = holm, dose = dose, twoway = twoway, corr = corr, surv = surv), "tests/stats-reference.json")
cat("Wrote tests/stats-reference.json\n")
